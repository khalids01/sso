import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

type SettingsRecord = {
  id: string;
  enabled: boolean;
  publicEnabled: boolean;
  publicWindowSeconds: number;
  publicMaxRequests: number;
  authEnabled: boolean;
  authWindowSeconds: number;
  authMaxRequests: number;
  protectedEnabled: boolean;
  protectedWindowSeconds: number;
  protectedMaxRequests: number;
  adminEnabled: boolean;
  adminWindowSeconds: number;
  adminMaxRequests: number;
  specialEnabled: boolean;
  specialWindowSeconds: number;
  specialMaxRequests: number;
  updatedAt: Date;
};

const redisState = {
  values: new Map<string, number>(),
  expiry: new Map<string, number>(),
  keys: [] as string[],
};

const fakeRedis = {
  async incr(key: string) {
    redisState.keys.push(key);
    const nextValue = (redisState.values.get(key) ?? 0) + 1;
    redisState.values.set(key, nextValue);
    return nextValue;
  },
  async expire(key: string, seconds: number) {
    redisState.expiry.set(key, Date.now() + seconds * 1000);
    return 1;
  },
  async ttl(key: string) {
    const expiresAt = redisState.expiry.get(key);
    if (!expiresAt) {
      return -1;
    }

    return Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
  },
  async get(key: string) {
    const value = redisState.values.get(key);
    return value === undefined ? null : String(value);
  },
  async mget(keys: string[]) {
    return keys.map((key) => {
      const value = redisState.values.get(key);
      return value === undefined ? null : String(value);
    });
  },
};

let currentSettings: SettingsRecord;
let currentSession:
  | {
    user: {
      id: string;
      role: string;
    };
  }
  | null = null;

const findUniqueMock = mock(async () => currentSettings);
const createMock = mock(async ({ data }: { data: SettingsRecord }) => data);
const upsertMock = mock(async ({ update }: { update: Partial<SettingsRecord> }) => {
  currentSettings = {
    ...currentSettings,
    ...update,
    updatedAt: new Date(Date.now()),
  };

  return currentSettings;
});
const getSessionMock = mock(async () => currentSession);
const connectRedisMock = mock(async () => fakeRedis);

mock.module("@db/server", () => ({
  default: {
    rateLimitSettings: {
      findUnique: findUniqueMock,
      create: createMock,
      upsert: upsertMock,
    },
  },
  Prisma,
}));

mock.module("@/modules/auth/auth.service", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

mock.module("@redis/server", () => ({
  connectRedis: connectRedisMock,
  getCache: mock(async () => null),
  setCache: mock(async () => undefined),
  deleteCache: mock(async () => undefined),
  getRedis: () => ({ status: "ready" }),
}));

function createSettings(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
  return {
    id: "default",
    enabled: true,
    publicEnabled: true,
    publicWindowSeconds: 60,
    publicMaxRequests: 2,
    authEnabled: true,
    authWindowSeconds: 60,
    authMaxRequests: 10,
    protectedEnabled: true,
    protectedWindowSeconds: 60,
    protectedMaxRequests: 2,
    adminEnabled: true,
    adminWindowSeconds: 60,
    adminMaxRequests: 300,
    specialEnabled: true,
    specialWindowSeconds: 60,
    specialMaxRequests: 30,
    updatedAt: new Date("2026-04-15T00:00:00.000Z"),
    ...overrides,
  };
}

type RequestHeaders = Record<string, string> | Headers | Array<[string, string]>;

function createContext(
  url: string,
  headers?: RequestHeaders,
  peerIp = "10.0.0.1",
) {
  return {
    request: new Request(url, { headers }),
    set: {
      status: 200,
      headers: {} as Record<string, string>,
    },
    server: {
      requestIP: () => ({
        address: peerIp,
      }),
    },
  };
}

beforeEach(() => {
  currentSettings = createSettings();
  currentSession = null;
  redisState.values.clear();
  redisState.expiry.clear();
  redisState.keys = [];
});

afterEach(async () => {
  const { rateLimitService } = await import("../src/modules/rate-limit/rate-limit.service");
  rateLimitService.invalidateCache();
  findUniqueMock.mockClear();
  createMock.mockClear();
  upsertMock.mockClear();
  getSessionMock.mockClear();
  connectRedisMock.mockClear();
});

describe("rateLimitService", () => {
  it("bypasses custom limiter for /api/auth/* routes", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");

    const first = createContext("http://localhost/api/auth/sign-in/magic-link");
    const second = createContext("http://localhost/api/auth/sign-in/magic-link");
    const third = createContext("http://localhost/api/auth/sign-in/magic-link");

    expect(await enforceRateLimit(first as any)).toBeUndefined();
    expect(await enforceRateLimit(second as any)).toBeUndefined();
    expect(await enforceRateLimit(third as any)).toBeUndefined();

    expect(first.set.status).toBe(200);
    expect(second.set.status).toBe(200);
    expect(third.set.status).toBe(200);
    expect(redisState.keys.length).toBe(0);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("rate limits the SSO-owned OAuth token endpoint", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    currentSettings = createSettings({ authMaxRequests: 2 });
    const requests = [1, 2, 3].map(() =>
      createContext("http://localhost/api/auth/oauth2/token"),
    );

    expect(await enforceRateLimit(requests[0] as any)).toBeUndefined();
    expect(await enforceRateLimit(requests[1] as any)).toBeUndefined();
    expect(await enforceRateLimit(requests[2] as any)).toMatchObject({
      message: "Too many requests",
      group: "auth",
    });
  });

  it("keeps custom auth limiter for /auth/* routes", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    currentSettings = createSettings({
      authMaxRequests: 2,
    });

    const first = createContext("http://localhost/auth/check-email", {
      "x-forwarded-for": "198.51.100.22",
    });
    const second = createContext("http://localhost/auth/check-email", {
      "x-forwarded-for": "198.51.100.22",
    });
    const third = createContext("http://localhost/auth/check-email", {
      "x-forwarded-for": "198.51.100.22",
    });

    expect(await enforceRateLimit(first as any)).toBeUndefined();
    expect(await enforceRateLimit(second as any)).toBeUndefined();

    const blocked = await enforceRateLimit(third as any);

    expect(blocked).toEqual({
      message: "Too many requests",
      group: "auth",
      retryAfterSeconds: 60,
    });
    expect(third.set.status).toBe(429);
    expect(
      redisState.keys.some((key) =>
        key.includes("ratelimit:auth:ip:198.51.100.22"),
      ),
    ).toBe(true);
  });

  it("uses the request IP for anonymous requests and blocks after the limit", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    const first = createContext("http://localhost/health", {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    const second = createContext("http://localhost/health", {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    const third = createContext("http://localhost/health", {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });

    expect(await enforceRateLimit(first as any)).toBeUndefined();
    expect(await enforceRateLimit(second as any)).toBeUndefined();

    const blocked = await enforceRateLimit(third as any);

    expect(blocked).toEqual({
      message: "Too many requests",
      group: "public",
      retryAfterSeconds: 60,
    });
    expect(third.set.status).toBe(429);
    expect(
      redisState.keys.some((key) =>
        key.includes("ratelimit:public:ip:203.0.113.10"),
      ),
    ).toBe(true);
  });

  it("ignores spoofed forwarded IP headers from untrusted public peers", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    currentSettings = createSettings({
      publicMaxRequests: 1,
    });

    const first = createContext(
      "http://localhost/health",
      {
        "x-forwarded-for": "203.0.113.10",
      },
      "198.51.100.99",
    );
    const second = createContext(
      "http://localhost/health",
      {
        "x-forwarded-for": "203.0.113.11",
      },
      "198.51.100.99",
    );

    expect(await enforceRateLimit(first as any)).toBeUndefined();

    const blocked = await enforceRateLimit(second as any);

    expect(blocked).toEqual({
      message: "Too many requests",
      group: "public",
      retryAfterSeconds: 60,
    });
    expect(
      redisState.keys.some((key) =>
        key.includes("ratelimit:public:ip:198.51.100.99"),
      ),
    ).toBe(true);
    expect(
      redisState.keys.some((key) =>
        key.includes("ratelimit:public:ip:203.0.113.11"),
      ),
    ).toBe(false);
  });

  it("uses the authenticated user id for protected requests", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    currentSession = {
      user: {
        id: "user-123",
      },
    };

    await enforceRateLimit(createContext("http://localhost/feedback") as any);

    expect(redisState.keys.some((key) => key.includes("ratelimit:protected:user:user-123"))).toBe(true);
  });

  it("resets the fixed window when time moves into the next bucket", async () => {
    const originalNow = Date.now;
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");

    Date.now = () => 0;
    await enforceRateLimit(createContext("http://localhost/health") as any);
    await enforceRateLimit(createContext("http://localhost/health") as any);

    Date.now = () => 61_000;
    const nextWindow = await enforceRateLimit(createContext("http://localhost/health") as any);

    expect(nextWindow).toBeUndefined();
    Date.now = originalNow;
  });

  it("returns 503 when redis is unavailable", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");
    connectRedisMock.mockRejectedValueOnce(new Error("Redis unavailable"));
    const originalConsoleError = console.error;
    console.error = mock(() => undefined) as unknown as typeof console.error;

    try {
      const result = await enforceRateLimit(createContext("http://localhost/health") as any);

      expect(result).toEqual({
        message: "Rate limit service unavailable",
      });
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("invalidates the cached config after updating settings", async () => {
    const { rateLimitService } = await import("../src/modules/rate-limit/rate-limit.service");

    const first = await rateLimitService.getOverview();
    expect(first.config.groups.public.maxRequests).toBe(2);

    await rateLimitService.updateConfig({
      enabled: true,
      groups: {
        public: { enabled: true, windowSeconds: 60, maxRequests: 5 },
        auth: { enabled: true, windowSeconds: 60, maxRequests: 10 },
        protected: { enabled: true, windowSeconds: 60, maxRequests: 2 },
        admin: { enabled: true, windowSeconds: 60, maxRequests: 300 },
        special: { enabled: true, windowSeconds: 60, maxRequests: 30 },
      },
    });

    const second = await rateLimitService.getOverview();

    expect(second.config.groups.public.maxRequests).toBe(5);
  });
});
