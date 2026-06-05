import prisma from "@db/server";
import { connectRedis } from "@redis/server";
import { auth } from "@/modules/auth/auth.service";
import {
  getClientIp,
  getTrustedCountry,
  type RequestIpLookup,
} from "../../lib/client-ip";
import { createHash } from "node:crypto";
import type { VisitorTrackBody } from "./visitors.dto";

const VISITOR_COOKIE_KEY = "visitor_id";
const VISITOR_COOKIE_TTL_SECONDS = 90 * 24 * 60 * 60;
const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
const RETENTION_DAYS = 90;
const BUFFER_TTL_SECONDS = 2 * 24 * 60 * 60;
const FLUSH_INTERVAL_MS = 60_000;
const FLUSH_BATCH_SIZE = 200;
const DIRTY_VISITOR_BUFFER_KEY = "visitors:buffer:dirty";
const VISITOR_BUFFER_KEY_PREFIX = "visitors:buffer:visit:";

let lastCleanupAt = 0;
let cleanupPromise: Promise<void> | null = null;
let flushInterval: ReturnType<typeof setInterval> | null = null;

type BufferedVisit = {
  visitorId: string;
  userId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  entryPath: string;
  lastPath: string;
  referrer: string | null;
  isBot: boolean;
  deviceType: string | null;
  country: string | null;
  ipHash: string | null;
  eventCount: number;
};

const botUserAgentRegex =
  /(bot|crawler|spider|slurp|bingpreview|headless|phantom|curl|wget|python-requests|go-http-client|httpclient|uptime|monitor|facebookexternalhit)/i;

function parseCookies(cookieHeader: string | null) {
  const values = new Map<string, string>();
  if (!cookieHeader) {
    return values;
  }

  for (const chunk of cookieHeader.split(";")) {
    const [rawKey, ...rest] = chunk.split("=");
    const key = rawKey?.trim();
    if (!key || rest.length === 0) {
      continue;
    }

    const value = rest.join("=").trim();
    if (!value) {
      continue;
    }

    values.set(key, decodeURIComponent(value));
  }

  return values;
}

function isValidVisitorId(visitorId: string | undefined): visitorId is string {
  if (!visitorId) {
    return false;
  }

  return /^[a-zA-Z0-9-]{20,100}$/.test(visitorId);
}

function isCrossSiteRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.hostname !== requestUrl.hostname;
  } catch {
    return false;
  }
}

function buildSetCookieHeader(visitorId: string, request: Request) {
  const isSecure = request.url.startsWith("https://");
  const sameSite = isCrossSiteRequest(request) ? "None" : "Lax";
  const parts = [
    `${VISITOR_COOKIE_KEY}=${encodeURIComponent(visitorId)}`,
    `Max-Age=${VISITOR_COOKIE_TTL_SECONDS}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];

  if (isSecure || sameSite === "None") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function hashIp(ip: string | null) {
  if (!ip) {
    return null;
  }

  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

function detectBot(userAgent: string | null) {
  if (!userAgent) {
    return false;
  }

  return botUserAgentRegex.test(userAgent);
}

function detectDeviceType(userAgent: string | null) {
  if (!userAgent) {
    return null;
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }

  if (
    ua.includes("mobile") ||
    ua.includes("iphone") ||
    ua.includes("android")
  ) {
    return "mobile";
  }

  return "desktop";
}

function normalizePath(inputPath: string) {
  let path = inputPath.trim();

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path.length > 500) {
    path = path.slice(0, 500);
  }

  return path;
}

function shouldTrackPath(path: string) {
  return ![
    "/admin",
    "/analytics",
    "/api",
    "/api/auth",
    "/auth",
    "/docs",
    "/openapi",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function normalizeReferrer(inputReferrer: string | undefined) {
  if (!inputReferrer) {
    return null;
  }

  const trimmed = inputReferrer.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 500);
}

async function enforceTrackRateLimit(ip: string | null, visitorId: string) {
  const redis = await connectRedis();

  const now = Date.now();
  const windowId = Math.floor(now / 60_000);

  const ipKey = `visitors:track:ip:${ip ?? "unknown"}:${windowId}`;
  const visitorKey = `visitors:track:visitor:${visitorId}:${windowId}`;

  const [ipCount, visitorCount] = await Promise.all([
    redis.incr(ipKey),
    redis.incr(visitorKey),
  ]);

  if (ipCount === 1) {
    await redis.expire(ipKey, 90);
  }

  if (visitorCount === 1) {
    await redis.expire(visitorKey, 90);
  }

  return ipCount <= 240 && visitorCount <= 120;
}

async function maybeRunRetentionCleanup() {
  const now = Date.now();

  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;

  const cutoff = new Date(now - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.visitorIdentity.deleteMany({
    where: {
      lastSeenAt: {
        lt: cutoff,
      },
    },
  });
}

function scheduleRetentionCleanup() {
  if (cleanupPromise) {
    return;
  }

  cleanupPromise = maybeRunRetentionCleanup()
    .catch((error) => {
      console.error("Visitor retention cleanup failed", error);
    })
    .finally(() => {
      cleanupPromise = null;
    });
}

function getBufferSubject(userId: string | null, visitorId: string) {
  return userId ? `user:${userId}` : `visitor:${visitorId}`;
}

function getBufferKey(subject: string) {
  const digest = createHash("sha256").update(subject).digest("hex").slice(0, 32);
  return `${VISITOR_BUFFER_KEY_PREFIX}${digest}`;
}

function parseBufferedVisit(raw: string | null): BufferedVisit | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as BufferedVisit;
  } catch {
    return null;
  }
}

function mergeBufferedVisit(
  current: BufferedVisit | null,
  next: BufferedVisit,
): BufferedVisit {
  if (!current) {
    return next;
  }

  return {
    ...current,
    userId: next.userId ?? current.userId,
    lastSeenAt: next.lastSeenAt,
    lastPath: next.lastPath,
    referrer: next.referrer,
    isBot: next.isBot,
    deviceType: next.deviceType,
    country: next.country,
    ipHash: next.ipHash,
    eventCount: current.eventCount + next.eventCount,
  };
}

async function bufferVisit(input: BufferedVisit) {
  const redis = await connectRedis();
  const subject = getBufferSubject(input.userId, input.visitorId);
  const key = getBufferKey(subject);
  const existing = parseBufferedVisit(await redis.get(key));
  const next = mergeBufferedVisit(existing, input);

  await redis.set(key, JSON.stringify(next), "EX", BUFFER_TTL_SECONDS);
  await redis.sadd(DIRTY_VISITOR_BUFFER_KEY, key);

  return next;
}

async function resolveVisitorIdentity(args: {
  visitorId: string;
  userId: string | null;
  firstSeenAt: Date;
  now: Date;
}) {
  if (args.userId) {
    const existingForUser = await prisma.visitorIdentity.findFirst({
      where: {
        OR: [{ lastUserId: args.userId }, { firstUserId: args.userId }],
      },
      orderBy: {
        lastSeenAt: "desc",
      },
    });

    if (existingForUser) {
      return prisma.visitorIdentity.update({
        where: {
          id: existingForUser.id,
        },
        data: {
          lastSeenAt: args.now,
          lastUserId: args.userId,
          firstUserId: existingForUser.firstUserId ?? args.userId,
        },
      });
    }
  }

  const existing = await prisma.visitorIdentity.findUnique({
    where: {
      visitorId: args.visitorId,
    },
  });

  if (!existing) {
    return prisma.visitorIdentity.create({
      data: {
        visitorId: args.visitorId,
        firstSeenAt: args.firstSeenAt,
        lastSeenAt: args.now,
        firstUserId: args.userId,
        lastUserId: args.userId,
      },
    });
  }

  return prisma.visitorIdentity.update({
    where: {
      id: existing.id,
    },
    data: {
      lastSeenAt: args.now,
      ...(args.userId
        ? {
            lastUserId: args.userId,
            firstUserId: existing.firstUserId ?? args.userId,
          }
        : {}),
    },
  });
}

async function resolveSession(args: {
  visitorIdentityId: string;
  userId: string | null;
  isBot: boolean;
  startedAt: Date;
  now: Date;
  path: string;
  entryPath: string;
  referrer: string | null;
  deviceType: string | null;
  country: string | null;
  ipHash: string | null;
  eventCount: number;
}) {
  const activeSince = new Date(args.now.getTime() - SESSION_IDLE_TIMEOUT_MS);

  const activeSession = await prisma.visitorSession.findFirst({
    where: {
      visitorIdentityId: args.visitorIdentityId,
      isBot: args.isBot,
      lastSeenAt: {
        gte: activeSince,
      },
    },
    orderBy: {
      lastSeenAt: "desc",
    },
  });

  if (activeSession) {
    return prisma.visitorSession.update({
      where: {
        id: activeSession.id,
      },
      data: {
        lastSeenAt: args.now,
        endedAt: args.now,
        lastPath: args.path,
        referrer: args.referrer,
        deviceType: args.deviceType,
        country: args.country,
        ipHash: args.ipHash,
        ...(args.userId ? { userId: args.userId } : {}),
        eventCount: {
          increment: args.eventCount,
        },
      },
    });
  }

  return prisma.visitorSession.create({
    data: {
      visitorIdentityId: args.visitorIdentityId,
      userId: args.userId,
      isBot: args.isBot,
      startedAt: args.startedAt,
      lastSeenAt: args.now,
      endedAt: args.now,
      entryPath: args.entryPath,
      lastPath: args.path,
      referrer: args.referrer,
      deviceType: args.deviceType,
      country: args.country,
      ipHash: args.ipHash,
      eventCount: args.eventCount,
    },
  });
}

async function persistBufferedVisit(input: BufferedVisit) {
  const firstSeenAt = new Date(input.firstSeenAt);
  const lastSeenAt = new Date(input.lastSeenAt);
  const identity = await resolveVisitorIdentity({
    visitorId: input.visitorId,
    userId: input.userId,
    firstSeenAt,
    now: lastSeenAt,
  });

  await resolveSession({
    visitorIdentityId: identity.id,
    userId: input.userId,
    isBot: input.isBot,
    startedAt: firstSeenAt,
    now: lastSeenAt,
    path: input.lastPath,
    entryPath: input.entryPath,
    referrer: input.referrer,
    deviceType: input.deviceType,
    country: input.country,
    ipHash: input.ipHash,
    eventCount: input.eventCount,
  });
}

export class VisitorsService {
  async flushBufferedVisits(limit = FLUSH_BATCH_SIZE) {
    const redis = await connectRedis();
    const keys = (await redis.smembers(DIRTY_VISITOR_BUFFER_KEY)).slice(0, limit);
    let flushed = 0;
    let failed = 0;

    for (const key of keys) {
      const processingKey = `${key}:processing:${crypto.randomUUID()}`;

      try {
        await redis.rename(key, processingKey);
      } catch {
        await redis.srem(DIRTY_VISITOR_BUFFER_KEY, key);
        continue;
      }

      try {
        const buffered = parseBufferedVisit(await redis.get(processingKey));
        if (!buffered) {
          await redis.del(processingKey);
          await redis.srem(DIRTY_VISITOR_BUFFER_KEY, key);
          continue;
        }

        await persistBufferedVisit(buffered);
        await redis.del(processingKey);
        await redis.srem(DIRTY_VISITOR_BUFFER_KEY, key);

        if ((await redis.exists(key)) > 0) {
          await redis.sadd(DIRTY_VISITOR_BUFFER_KEY, key);
        }

        flushed += 1;
      } catch (error) {
        failed += 1;
        try {
          await redis.sadd(DIRTY_VISITOR_BUFFER_KEY, processingKey);
          await redis.srem(DIRTY_VISITOR_BUFFER_KEY, key);

          if ((await redis.exists(key)) > 0) {
            await redis.sadd(DIRTY_VISITOR_BUFFER_KEY, key);
          }
        } catch {
          // Keep the worker alive; the next interval can process any keys
          // still present in the dirty set.
        }
        console.error("Visitor buffer flush failed", error);
      }
    }

    scheduleRetentionCleanup();

    return {
      flushed,
      failed,
      remaining: Math.max(0, keys.length - flushed),
    };
  }

  async trackVisit(input: {
    request: Request;
    body: VisitorTrackBody;
    setCookie: (value: string) => void;
    requestIP?: RequestIpLookup;
  }) {
    const cookies = parseCookies(input.request.headers.get("cookie"));
    const existingVisitorId = cookies.get(VISITOR_COOKIE_KEY);
    const visitorId = isValidVisitorId(existingVisitorId)
      ? existingVisitorId
      : crypto.randomUUID();

    if (!existingVisitorId || existingVisitorId !== visitorId) {
      input.setCookie(buildSetCookieHeader(visitorId, input.request));
    }

    const { ip, trustedProxyHeaders } = getClientIp({
      request: input.request,
      requestIP: input.requestIP,
    });
    const allowed = await enforceTrackRateLimit(ip, visitorId);
    if (!allowed) {
      return {
        ok: false,
        rateLimited: true,
      };
    }

    const now = new Date();
    const path = normalizePath(input.body.path);
    if (!shouldTrackPath(path)) {
      return {
        ok: true,
        visitorId,
        ignored: true,
      };
    }

    const referrer = normalizeReferrer(input.body.referrer);
    const userAgent = input.request.headers.get("user-agent");

    const session = await auth.api.getSession({
      headers: input.request.headers,
    });

    const userId = session?.user?.id ?? null;

    const buffered = await bufferVisit({
      visitorId,
      userId,
      firstSeenAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      entryPath: path,
      lastPath: path,
      referrer,
      isBot: detectBot(userAgent),
      deviceType: detectDeviceType(userAgent),
      country: getTrustedCountry(input.request.headers, trustedProxyHeaders),
      ipHash: hashIp(ip),
      eventCount: 1,
    });

    if (buffered.visitorId !== visitorId) {
      input.setCookie(buildSetCookieHeader(buffered.visitorId, input.request));
    }

    return {
      ok: true,
      visitorId: buffered.visitorId,
    };
  }
}

export const visitorsService = new VisitorsService();

export function startVisitorFlushWorker(intervalMs = FLUSH_INTERVAL_MS) {
  if (flushInterval) {
    return;
  }

  flushInterval = setInterval(() => {
    void visitorsService.flushBufferedVisits().catch((error) => {
      console.error("Visitor buffer worker failed", error);
    });
  }, intervalMs);

  flushInterval.unref?.();
}

export function stopVisitorFlushWorker() {
  if (!flushInterval) {
    return;
  }

  clearInterval(flushInterval);
  flushInterval = null;
}
