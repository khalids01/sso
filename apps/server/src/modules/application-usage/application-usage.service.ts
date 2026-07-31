import { createHash } from "node:crypto";
import prisma, {
  type ApplicationUsageAuthMethod,
  type ApplicationUsageEventType,
  type ApplicationUsageOutcome,
  type Prisma,
} from "@sso/db/server";
import { getClientIp, type RequestIpLookup } from "@/lib/client-ip";

const RETENTION_DAYS = 180;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export type RecordApplicationUsageInput = {
  type: ApplicationUsageEventType;
  outcome: ApplicationUsageOutcome;
  userId?: string | null;
  applicationId?: string | null;
  applicationClientId?: string | null;
  oauthProviderConnectionId?: string | null;
  authMethod?: ApplicationUsageAuthMethod | null;
  requestId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
  request?: Request;
  requestIP?: RequestIpLookup;
};

function hashIp(ip: string | null) {
  return ip
    ? createHash("sha256").update(ip).digest("hex").slice(0, 24)
    : null;
}

export async function recordApplicationUsage(
  input: RecordApplicationUsageInput,
) {
  try {
    const ip = input.request
      ? getClientIp({ request: input.request, requestIP: input.requestIP }).ip
      : null;
    return await prisma.applicationUsageEvent.create({
      data: {
        type: input.type,
        outcome: input.outcome,
        userId: input.userId ?? null,
        applicationId: input.applicationId ?? null,
        applicationClientId: input.applicationClientId ?? null,
        oauthProviderConnectionId: input.oauthProviderConnectionId ?? null,
        authMethod: input.authMethod ?? null,
        requestId: input.requestId ?? null,
        reason: input.reason ?? null,
        ipHash: hashIp(ip),
        userAgent: input.request?.headers.get("user-agent")?.slice(0, 500) ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Application usage recording failed", {
      type: input.type,
      requestId: input.requestId,
      error: error instanceof Error ? error.name : "unknown_error",
    });
    return null;
  }
}

export async function cleanupExpiredApplicationUsage() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000);
  return prisma.applicationUsageEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}

export function startApplicationUsageRetentionWorker() {
  if (cleanupTimer) return;
  void cleanupExpiredApplicationUsage().catch((error) => {
    console.error("Application usage retention cleanup failed", error);
  });
  cleanupTimer = setInterval(() => {
    void cleanupExpiredApplicationUsage().catch((error) => {
      console.error("Application usage retention cleanup failed", error);
    });
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
}
