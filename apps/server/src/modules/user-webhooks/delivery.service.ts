import { createHmac } from "node:crypto";
import prisma, { Prisma } from "@sso/db/server";
import { USER_WEBHOOK_DELIVERY_TTL_MS } from "@sso/db/server/user-webhooks";
import { env } from "@sso/env/server";
import {
  assertSafeRevocationDestination,
  classifyDeliveryStatus,
  retryDelayMs,
} from "../application-revocation/revocation.service";

const LEASE_MS = 30_000;
const TIMEOUT_MS = 10_000;

type ClaimedDelivery = {
  id: string; applicationId: string; endpointId: string | null; destinationUrl: string;
  eventType: string; payload: Prisma.JsonValue; attemptCount: number; deadlineAt: Date;
};

function hmac(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function claimNext(now = new Date()) {
  const leaseUntil = new Date(now.getTime() + LEASE_MS);
  const rows = await prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "application_webhook_delivery"
    SET "status" = 'delivering', "leaseUntil" = ${leaseUntil}, "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "application_webhook_delivery"
      WHERE (("status" = 'pending' AND "nextAttemptAt" <= ${now}) OR ("status" = 'delivering' AND "leaseUntil" < ${now}))
        AND "deadlineAt" > ${now}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING "id", "applicationId", "endpointId", "destinationUrl", "eventType", "payload", "attemptCount", "deadlineAt"
  `;
  return rows[0] ?? null;
}

async function expireNext(now = new Date()) {
  const rows = await prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "application_webhook_delivery" SET "status" = 'dead', "leaseUntil" = NULL,
      "lastErrorCode" = 'delivery_deadline_expired', "updatedAt" = NOW()
    WHERE "id" = (SELECT "id" FROM "application_webhook_delivery" WHERE "status" IN ('pending','delivering')
      AND "deadlineAt" <= ${now} ORDER BY "deadlineAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING "id", "applicationId", "endpointId", "destinationUrl", "eventType", "payload", "attemptCount", "deadlineAt"
  `;
  return Boolean(rows[0]);
}

async function fail(delivery: ClaimedDelivery, input: { errorCode: string; httpStatus?: number; terminal?: boolean }) {
  const attemptCount = delivery.attemptCount + 1;
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(attemptCount));
  const dead = input.terminal || nextAttemptAt >= delivery.deadlineAt;
  await prisma.applicationWebhookDelivery.update({ where: { id: delivery.id }, data: {
    status: dead ? "dead" : "pending", attemptCount, nextAttemptAt, leaseUntil: null,
    lastHttpStatus: input.httpStatus, lastErrorCode: input.errorCode,
  }});
}

export async function processNextUserWebhookDelivery() {
  if (await expireNext()) return true;
  const delivery = await claimNext();
  if (!delivery) return false;
  const endpoint = delivery.endpointId ? await prisma.applicationWebhookEndpoint.findUnique({
    where: { id: delivery.endpointId }, select: { enabled: true, secret: true },
  }) : null;
  if (!endpoint?.enabled) { await fail(delivery, { errorCode: "endpoint_disabled", terminal: true }); return true; }
  try {
    const destination = await assertSafeRevocationDestination(delivery.destinationUrl, { allowLocal: env.ALLOW_LOCAL_APPLICATION_WEBHOOKS });
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(Date.now() / 1_000);
    const response = await fetch(destination, { method: "POST", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: {
      "content-type": "application/json", "x-sso-event-id": delivery.id,
      "x-sso-timestamp": String(timestamp), "x-sso-signature": `t=${timestamp},v1=${hmac(endpoint.secret, timestamp, body)}`,
    }, body });
    const outcome = classifyDeliveryStatus(response.status);
    if (outcome === "delivered") {
      await prisma.applicationWebhookDelivery.update({ where: { id: delivery.id }, data: {
        status: "delivered", attemptCount: delivery.attemptCount + 1, deliveredAt: new Date(), leaseUntil: null,
        lastHttpStatus: response.status, lastErrorCode: null,
      }});
    } else await fail(delivery, { errorCode: outcome === "retry" ? "http_retryable" : "http_terminal", httpStatus: response.status, terminal: outcome === "terminal" });
  } catch (error) {
    const unsafe = error instanceof Error && error.message.includes("private or reserved");
    await fail(delivery, { errorCode: unsafe ? "unsafe_destination" : error instanceof Error && error.name === "TimeoutError" ? "request_timeout" : "network_error", terminal: unsafe });
  }
  return true;
}

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;
export function startUserWebhookWorker() {
  if (!env.ENABLE_USER_WEBHOOK_DELIVERY || timer) return;
  const tick = async () => {
    if (running) return; running = true;
    try { for (let i = 0; i < 10 && await processNextUserWebhookDelivery(); i += 1) {} }
    catch (error) { console.error("User webhook worker failed", { error: error instanceof Error ? error.name : "unknown_error" }); }
    finally { running = false; }
  };
  void tick(); timer = setInterval(() => void tick(), 5_000); timer.unref?.();
}

export { USER_WEBHOOK_DELIVERY_TTL_MS };
