import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { auth } from "@auth/server";
import prisma, { Prisma } from "@db/server";
import { env } from "@env/server";

export const REVOCATION_EVENT_TYPE = "application.access.revoked";
export const REVOCATION_DELIVERY_TTL_MS = 24 * 60 * 60 * 1_000;
const DELIVERY_LEASE_MS = 30_000;
const DELIVERY_TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000, 6 * 60 * 60_000];

export type RevocationReason =
  | "membership_suspended"
  | "membership_revoked"
  | "user_banned"
  | "user_archived"
  | "application_disabled"
  | "application_archived";

type Transaction = Prisma.TransactionClient;

export type ClaimedDelivery = {
  id: string;
  applicationId: string;
  endpointId: string | null;
  membershipId: string | null;
  destinationUrl: string;
  eventType: string;
  reason: string;
  subject: string | null;
  authorizationVersion: number | null;
  effectiveAt: Date;
  attemptCount: number;
  deadlineAt: Date;
};

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const a = parts[0]!;
  const b = parts[1]!;
  const c = parts[2]!;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isPrivateOrReservedAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;

  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return true;
  }
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("64:ff9b:") ||
    normalized.startsWith("2001:0:") ||
    normalized.startsWith("2001:2:") ||
    /^2001:0?1[0-9a-f]:/.test(normalized) ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("2002:") ||
    normalized.startsWith("3fff:")
  );
}

export function validateRevocationWebhookUrl(
  value: string,
  options: { allowLocal?: boolean } = {},
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Webhook URL must be a valid absolute URL");
  }

  if (url.username || url.password || url.hash) {
    throw new Error("Webhook URL cannot contain credentials or a fragment");
  }
  const localAllowed = options.allowLocal === true && isLoopbackHostname(url.hostname);
  if (url.protocol !== "https:" && !(localAllowed && url.protocol === "http:")) {
    throw new Error("Webhook URL must use HTTPS");
  }
  return url.toString();
}

export async function assertSafeRevocationDestination(
  value: string,
  options: { allowLocal?: boolean } = {},
) {
  const normalized = validateRevocationWebhookUrl(value, options);
  const url = new URL(normalized);
  if (options.allowLocal && isLoopbackHostname(url.hostname)) return normalized;

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateOrReservedAddress(address))) {
    throw new Error("Webhook destination resolves to a private or reserved address");
  }
  return normalized;
}

async function getEnabledEndpoint(tx: Transaction, applicationId: string) {
  return tx.applicationRevocationEndpoint.findFirst({
    where: { applicationId, enabled: true },
    select: { id: true, url: true },
  });
}

export async function enqueueMemberRevocation(
  tx: Transaction,
  input: {
    applicationId: string;
    membershipId: string;
    subject: string;
    authorizationVersion: number;
    reason: Exclude<RevocationReason, "application_disabled" | "application_archived">;
    effectiveAt: Date;
  },
) {
  const endpoint = await getEnabledEndpoint(tx, input.applicationId);
  if (!endpoint) return null;

  return tx.applicationRevocationDelivery.create({
    data: {
      applicationId: input.applicationId,
      endpointId: endpoint.id,
      membershipId: input.membershipId,
      destinationUrl: endpoint.url,
      reason: input.reason,
      subject: input.subject,
      authorizationVersion: input.authorizationVersion,
      effectiveAt: input.effectiveAt,
      deadlineAt: new Date(input.effectiveAt.getTime() + REVOCATION_DELIVERY_TTL_MS),
    },
  });
}

export async function enqueueApplicationRevocation(
  tx: Transaction,
  input: {
    applicationId: string;
    reason: "application_disabled" | "application_archived";
    effectiveAt: Date;
  },
) {
  const endpoint = await getEnabledEndpoint(tx, input.applicationId);
  if (!endpoint) return null;

  return tx.applicationRevocationDelivery.create({
    data: {
      applicationId: input.applicationId,
      endpointId: endpoint.id,
      destinationUrl: endpoint.url,
      reason: input.reason,
      effectiveAt: input.effectiveAt,
      deadlineAt: new Date(input.effectiveAt.getTime() + REVOCATION_DELIVERY_TTL_MS),
    },
  });
}

export function retryDelayMs(attemptCount: number) {
  return RETRY_DELAYS_MS[Math.min(Math.max(attemptCount - 1, 0), RETRY_DELAYS_MS.length - 1)]!;
}

export function classifyDeliveryStatus(status: number) {
  if (status >= 200 && status < 300) return "delivered" as const;
  if (status === 408 || status === 429 || status >= 500) return "retry" as const;
  return "terminal" as const;
}

export function buildRevocationEventPayload(
  delivery: ClaimedDelivery,
  now = Math.floor(Date.now() / 1_000),
) {
  return {
    iss: env.SSO_ISSUER,
    aud: `urn:sso:application:${delivery.applicationId}`,
    iat: now,
    exp: now + 5 * 60,
    jti: delivery.id,
    event_type: delivery.eventType,
    reason: delivery.reason,
    sub: delivery.subject ?? undefined,
    application_id: delivery.applicationId,
    membership_id: delivery.membershipId ?? undefined,
    authorization_version: delivery.authorizationVersion ?? undefined,
    effective_at: Math.floor(delivery.effectiveAt.getTime() / 1_000),
  };
}

export async function createSignedRevocationEvent(delivery: ClaimedDelivery) {
  const result = await auth.api.signJWT({
    body: {
      payload: buildRevocationEventPayload(delivery),
    },
  });
  return result.token;
}

async function claimNextDelivery(now = new Date()) {
  const leaseUntil = new Date(now.getTime() + DELIVERY_LEASE_MS);
  const rows = await prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "application_revocation_delivery"
    SET "status" = 'delivering', "leaseUntil" = ${leaseUntil}, "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id"
      FROM "application_revocation_delivery"
      WHERE (
        ("status" = 'pending' AND "nextAttemptAt" <= ${now})
        OR ("status" = 'delivering' AND "leaseUntil" < ${now})
      )
      AND "deadlineAt" > ${now}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "applicationId", "endpointId", "membershipId",
      "destinationUrl", "eventType", "reason", "subject",
      "authorizationVersion", "effectiveAt", "attemptCount", "deadlineAt"
  `;
  return rows[0] ?? null;
}

async function expireNextDelivery(now = new Date()) {
  const rows = await prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "application_revocation_delivery"
    SET "status" = 'dead', "leaseUntil" = NULL,
      "lastErrorCode" = 'delivery_deadline_expired', "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id"
      FROM "application_revocation_delivery"
      WHERE "status" IN ('pending', 'delivering')
        AND "deadlineAt" <= ${now}
      ORDER BY "deadlineAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "applicationId", "endpointId", "membershipId",
      "destinationUrl", "eventType", "reason", "subject",
      "authorizationVersion", "effectiveAt", "attemptCount", "deadlineAt"
  `;
  const delivery = rows[0];
  if (!delivery) return false;
  await recordDeliveryActivity(delivery, "application.revocation_dead_lettered", {
    attemptCount: delivery.attemptCount,
    errorCode: "delivery_deadline_expired",
    httpStatus: null,
  });
  return true;
}

async function recordDeliveryActivity(
  delivery: ClaimedDelivery,
  type: "application.revocation_delivered" | "application.revocation_dead_lettered",
  metadata: Prisma.InputJsonObject,
) {
  try {
    await prisma.activityEvent.create({
      data: {
        type,
        severity: type.endsWith("dead_lettered") ? "warning" : "info",
        message: type.endsWith("dead_lettered")
          ? "Application revocation delivery dead-lettered"
          : "Application revocation delivered",
        metadata: {
          deliveryId: delivery.id,
          applicationId: delivery.applicationId,
          reason: delivery.reason,
          ...metadata,
        },
      },
    });
  } catch (error) {
    console.error("Revocation delivery activity recording failed", {
      deliveryId: delivery.id,
      error: error instanceof Error ? error.name : "unknown_error",
    });
  }
}

async function finishFailure(
  delivery: ClaimedDelivery,
  input: { errorCode: string; httpStatus?: number; terminal?: boolean },
) {
  const attemptCount = delivery.attemptCount + 1;
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(attemptCount));
  const dead = input.terminal || nextAttemptAt >= delivery.deadlineAt;
  await prisma.applicationRevocationDelivery.update({
    where: { id: delivery.id },
    data: {
      status: dead ? "dead" : "pending",
      attemptCount,
      nextAttemptAt,
      leaseUntil: null,
      lastHttpStatus: input.httpStatus,
      lastErrorCode: input.errorCode,
    },
  });
  if (dead) {
    await recordDeliveryActivity(delivery, "application.revocation_dead_lettered", {
      attemptCount,
      errorCode: input.errorCode,
      httpStatus: input.httpStatus ?? null,
    });
  }
}

export async function processNextRevocationDelivery() {
  if (await expireNextDelivery()) return true;
  const delivery = await claimNextDelivery();
  if (!delivery) return false;

  const endpoint = delivery.endpointId
    ? await prisma.applicationRevocationEndpoint.findUnique({
        where: { id: delivery.endpointId },
        select: { enabled: true },
      })
    : null;
  if (!endpoint?.enabled) {
    await finishFailure(delivery, { errorCode: "endpoint_disabled", terminal: true });
    return true;
  }

  try {
    const destination = await assertSafeRevocationDestination(delivery.destinationUrl, {
      allowLocal: env.ALLOW_LOCAL_APPLICATION_WEBHOOKS,
    });
    const token = await createSignedRevocationEvent(delivery);
    const response = await fetch(destination, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      headers: {
        "content-type": "application/jwt",
        "x-sso-event-id": delivery.id,
      },
      body: token,
    });
    const outcome = classifyDeliveryStatus(response.status);
    if (outcome === "delivered") {
      const attemptCount = delivery.attemptCount + 1;
      await prisma.applicationRevocationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "delivered",
          attemptCount,
          deliveredAt: new Date(),
          leaseUntil: null,
          lastHttpStatus: response.status,
          lastErrorCode: null,
        },
      });
      await recordDeliveryActivity(delivery, "application.revocation_delivered", {
        attemptCount,
        httpStatus: response.status,
      });
      return true;
    }
    await finishFailure(delivery, {
      errorCode: outcome === "retry" ? "http_retryable" : "http_terminal",
      httpStatus: response.status,
      terminal: outcome === "terminal",
    });
  } catch (error) {
    await finishFailure(delivery, {
      errorCode:
        error instanceof Error && error.name === "TimeoutError"
          ? "request_timeout"
          : error instanceof Error && error.message.includes("private or reserved")
            ? "unsafe_destination"
            : "network_error",
      terminal: error instanceof Error && error.message.includes("private or reserved"),
    });
  }
  return true;
}

let workerTimer: ReturnType<typeof setInterval> | undefined;
let workerRunning = false;

export function startApplicationRevocationWorker() {
  if (!env.ENABLE_APPLICATION_REVOCATION_DELIVERY || workerTimer) return;
  const tick = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      for (let processed = 0; processed < 10; processed += 1) {
        if (!(await processNextRevocationDelivery())) break;
      }
    } catch (error) {
      console.error("Application revocation worker failed", {
        error: error instanceof Error ? error.name : "unknown_error",
      });
    } finally {
      workerRunning = false;
    }
  };
  void tick();
  workerTimer = setInterval(() => void tick(), 5_000);
  workerTimer.unref?.();
}
