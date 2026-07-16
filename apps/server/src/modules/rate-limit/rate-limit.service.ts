import prisma from "@db/server";
import { auth } from "@/modules/auth/auth.service";
import { connectRedis } from "@redis/server";
import { getClientIp } from "../../lib/client-ip";
import type { RateLimitSettings } from "@db/server";
import type {
  RateLimitConfigInput,
  UpdateRateLimitInput,
} from "./rate-limit.dto";

export const RATE_LIMIT_GROUPS = [
  "public",
  "auth",
  "protected",
  "admin",
  "special",
] as const;

export type RateLimitGroup = (typeof RATE_LIMIT_GROUPS)[number];

type RateLimitGroupConfig = {
  enabled: boolean;
  windowSeconds: number;
  maxRequests: number;
};

export type RateLimitConfig = {
  enabled: boolean;
  groups: Record<RateLimitGroup, RateLimitGroupConfig>;
};

type CachedSettings = {
  expiresAt: number;
  value: RateLimitOverview;
};

type RateLimitOverview = {
  config: RateLimitConfig;
  stats: Record<RateLimitGroup, { blockedLastHour: number; blockedToday: number }>;
  updatedAt: Date;
};

type EnforceInput = {
  request: Request;
  set: {
    status?: number | string;
    headers: {
      set: (key: string, value: string) => unknown;
    };
  };
  server?: {
    requestIP?: (request: Request) => { address?: string | null } | null;
  } | null;
  route?: string;
};

type RateLimitDecision =
  | { allowed: true }
  | {
    allowed: false;
    group: RateLimitGroup;
    limit: number;
    remaining: number;
    retryAfterSeconds: number;
    resetAt: number;
  };

const SETTINGS_ID = "default";
const SETTINGS_CACHE_TTL_MS = 10_000;

let settingsCache: CachedSettings | null = null;

const defaultConfig: RateLimitConfig = {
  enabled: true,
  groups: {
    public: {
      enabled: true,
      windowSeconds: 60,
      maxRequests: 60,
    },
    auth: {
      enabled: true,
      windowSeconds: 60,
      maxRequests: 10,
    },
    protected: {
      enabled: true,
      windowSeconds: 60,
      maxRequests: 120,
    },
    admin: {
      enabled: true,
      windowSeconds: 60,
      maxRequests: 300,
    },
    special: {
      enabled: true,
      windowSeconds: 60,
      maxRequests: 30,
    },
  },
};

function toConfig(settings: RateLimitSettings): RateLimitConfig {
  return {
    enabled: settings.enabled,
    groups: {
      public: {
        enabled: settings.publicEnabled,
        windowSeconds: settings.publicWindowSeconds,
        maxRequests: settings.publicMaxRequests,
      },
      auth: {
        enabled: settings.authEnabled,
        windowSeconds: settings.authWindowSeconds,
        maxRequests: settings.authMaxRequests,
      },
      protected: {
        enabled: settings.protectedEnabled,
        windowSeconds: settings.protectedWindowSeconds,
        maxRequests: settings.protectedMaxRequests,
      },
      admin: {
        enabled: settings.adminEnabled,
        windowSeconds: settings.adminWindowSeconds,
        maxRequests: settings.adminMaxRequests,
      },
      special: {
        enabled: settings.specialEnabled,
        windowSeconds: settings.specialWindowSeconds,
        maxRequests: settings.specialMaxRequests,
      },
    },
  };
}

function toUpdateData(input: UpdateRateLimitInput) {
  return {
    enabled: input.enabled,
    publicEnabled: input.groups.public.enabled,
    publicWindowSeconds: input.groups.public.windowSeconds,
    publicMaxRequests: input.groups.public.maxRequests,
    authEnabled: input.groups.auth.enabled,
    authWindowSeconds: input.groups.auth.windowSeconds,
    authMaxRequests: input.groups.auth.maxRequests,
    protectedEnabled: input.groups.protected.enabled,
    protectedWindowSeconds: input.groups.protected.windowSeconds,
    protectedMaxRequests: input.groups.protected.maxRequests,
    adminEnabled: input.groups.admin.enabled,
    adminWindowSeconds: input.groups.admin.windowSeconds,
    adminMaxRequests: input.groups.admin.maxRequests,
    specialEnabled: input.groups.special.enabled,
    specialWindowSeconds: input.groups.special.windowSeconds,
    specialMaxRequests: input.groups.special.maxRequests,
  };
}

function minuteBucket(timestamp: number) {
  return Math.floor(timestamp / 60_000);
}

function dayBucket(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMinuteStatsKeys(group: RateLimitGroup, now: number) {
  const currentBucket = minuteBucket(now);
  return Array.from({ length: 60 }, (_, index) => {
    const bucket = currentBucket - index;
    return `ratelimit:stats:blocked:${group}:minute:${bucket}`;
  });
}

function getTodayStatsKey(group: RateLimitGroup, date: Date) {
  return `ratelimit:stats:blocked:${group}:day:${dayBucket(date)}`;
}

function getSubject(sessionUserId: string | null, ip: string | null) {
  if (sessionUserId) {
    return `user:${sessionUserId}`;
  }

  return `ip:${ip ?? "unknown"}`;
}

async function getSessionSummary(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return {
    userId: session?.user?.id ?? null,
  };
}

function getGroup(pathname: string, userId: string | null): RateLimitGroup {
  if (pathname === "/polar/webhooks" || pathname === "/notifications/ws") {
    return "special";
  }

  if (pathname.startsWith("/auth/") || pathname.startsWith("/api/auth/")) {
    return "auth";
  }

  if (pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (userId) {
    return "protected";
  }

  return "public";
}

async function readStats() {
  const redis = await connectRedis();

  const emptyStats = RATE_LIMIT_GROUPS.reduce(
    (result, group) => {
      result[group] = { blockedLastHour: 0, blockedToday: 0 };
      return result;
    },
    {} as Record<RateLimitGroup, { blockedLastHour: number; blockedToday: number }>,
  );

  if (!redis) {
    return emptyStats;
  }

  const now = Date.now();
  const today = new Date(now);

  for (const group of RATE_LIMIT_GROUPS) {
    const minuteValues = await redis.mget(getMinuteStatsKeys(group, now));
    const blockedLastHour = minuteValues.reduce((sum, value) => {
      return sum + Number.parseInt(value ?? "0", 10);
    }, 0);

    const blockedToday = Number.parseInt(
      (await redis.get(getTodayStatsKey(group, today))) ?? "0",
      10,
    );

    emptyStats[group] = {
      blockedLastHour,
      blockedToday,
    };
  }

  return emptyStats;
}

async function incrementBlockedStats(group: RateLimitGroup) {
  const redis = await connectRedis();
  if (!redis) {
    return;
  }

  const now = Date.now();
  const minuteKey = `ratelimit:stats:blocked:${group}:minute:${minuteBucket(now)}`;
  const todayKey = getTodayStatsKey(group, new Date(now));

  const minuteCount = await redis.incr(minuteKey);
  if (minuteCount === 1) {
    await redis.expire(minuteKey, 60 * 120);
  }

  const todayCount = await redis.incr(todayKey);
  if (todayCount === 1) {
    await redis.expire(todayKey, 60 * 60 * 48);
  }
}

async function getOrCreateSettings() {
  const settings = await prisma.rateLimitSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (settings) {
    return settings;
  }

  return prisma.rateLimitSettings.create({
    data: {
      id: SETTINGS_ID,
      ...toUpdateData(defaultConfig),
    },
  });
}

async function buildOverview() {
  const [settings, stats] = await Promise.all([getOrCreateSettings(), readStats()]);

  return {
    config: toConfig(settings),
    stats,
    updatedAt: settings.updatedAt,
  };
}

async function getOverview() {
  if (settingsCache && settingsCache.expiresAt > Date.now()) {
    return settingsCache.value;
  }

  const overview = await buildOverview();
  settingsCache = {
    value: overview,
    expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS,
  };

  return overview;
}

async function getConfig() {
  const overview = await getOverview();
  return overview.config;
}

function invalidateCache() {
  settingsCache = null;
}

async function consumeRateLimit(
  group: RateLimitGroup,
  subject: string,
  config: RateLimitGroupConfig,
): Promise<RateLimitDecision> {
  if (!config.enabled) {
    return { allowed: true };
  }

  const redis = await connectRedis();
  if (!redis) {
    return { allowed: true };
  }

  const now = Date.now();
  const windowId = Math.floor(now / (config.windowSeconds * 1000));
  const key = `ratelimit:${group}:${subject}:${windowId}`;

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, config.windowSeconds);
  }

  if (current <= config.maxRequests) {
    return { allowed: true };
  }

  const ttl = await redis.ttl(key);
  const retryAfterSeconds = ttl > 0 ? ttl : config.windowSeconds;
  const resetAt = now + retryAfterSeconds * 1000;

  return {
    allowed: false,
    group,
    limit: config.maxRequests,
    remaining: 0,
    retryAfterSeconds,
    resetAt,
  };
}

function applyRateLimitHeaders(
  headers: {
    set?: (key: string, value: string) => unknown;
    [key: string]: unknown;
  },
  decision: Extract<RateLimitDecision, { allowed: false }>,
) {
  if (typeof headers.set === "function") {
    headers.set("Retry-After", String(decision.retryAfterSeconds));
    headers.set("X-RateLimit-Limit", String(decision.limit));
    headers.set("X-RateLimit-Remaining", String(decision.remaining));
    headers.set("X-RateLimit-Reset", String(Math.floor(decision.resetAt / 1000)));
    return;
  }

  headers["Retry-After"] = String(decision.retryAfterSeconds);
  headers["X-RateLimit-Limit"] = String(decision.limit);
  headers["X-RateLimit-Remaining"] = String(decision.remaining);
  headers["X-RateLimit-Reset"] = String(Math.floor(decision.resetAt / 1000));
}

export async function enforceRateLimit(input: EnforceInput) {
  const { request, set } = input;

  try {
    const pathname = new URL(request.url).pathname;

    // Let Better Auth handle its own endpoint rate limiting so we avoid
    // double-throttling the same auth paths.
    if (
      pathname.startsWith("/api/auth/") &&
      pathname !== "/api/auth/oauth2/token"
    ) {
      return;
    }

    const [config, session] = await Promise.all([
      getConfig(),
      getSessionSummary(request),
    ]);

    if (!config.enabled) {
      return;
    }

    const group = getGroup(pathname, session.userId);
    const { ip } = getClientIp({
      request,
      requestIP: input.server?.requestIP
        ? (currentRequest) => input.server!.requestIP!(currentRequest)
        : undefined,
    });
    const subject = getSubject(session.userId, ip);
    const decision = await consumeRateLimit(group, subject, config.groups[group]);

    if (decision.allowed) {
      return;
    }

    set.status = 429;
    applyRateLimitHeaders(set.headers, decision);
    await incrementBlockedStats(group);

    return {
      message: "Too many requests",
      group,
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  } catch (error) {
    console.error("Rate limit check failed", error);
    set.status = 503;
    return {
      message: "Rate limit service unavailable",
    };
  }
}

export async function enforceWebsocketRateLimit(request: Request) {
  try {
    const [config, session] = await Promise.all([
      getConfig(),
      getSessionSummary(request),
    ]);

    if (!config.enabled || !config.groups.special.enabled) {
      return { allowed: true as const };
    }

    const { ip } = getClientIp({ request });
    const subject = getSubject(session.userId, ip);
    const decision = await consumeRateLimit("special", subject, config.groups.special);

    if (decision.allowed) {
      return { allowed: true as const };
    }

    await incrementBlockedStats("special");

    return {
      allowed: false as const,
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  } catch (error) {
    console.error("Websocket rate limit check failed", error);
    return { allowed: false as const, retryAfterSeconds: 60 };
  }
}

export const rateLimitService = {
  async getOverview() {
    return getOverview();
  },

  async updateConfig(input: UpdateRateLimitInput) {
    const settings = await prisma.rateLimitSettings.upsert({
      where: { id: SETTINGS_ID },
      update: toUpdateData(input),
      create: {
        id: SETTINGS_ID,
        ...toUpdateData(input),
      },
    });

    invalidateCache();

    return {
      config: toConfig(settings),
      stats: await readStats(),
      updatedAt: settings.updatedAt,
    };
  },

  invalidateCache,

  getDefaultConfig(): RateLimitConfigInput {
    return defaultConfig;
  },
};
