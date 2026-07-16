import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";
import { Elysia } from "elysia";

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
};

const fakeRedis = {
  async incr(key: string) {
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
    publicMaxRequests: 60,
    authEnabled: true,
    authWindowSeconds: 60,
    authMaxRequests: 2,
    protectedEnabled: true,
    protectedWindowSeconds: 60,
    protectedMaxRequests: 120,
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

beforeEach(() => {
  currentSettings = createSettings();
  currentSession = null;
  redisState.values.clear();
  redisState.expiry.clear();
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

describe("rate limit integration", () => {
  it("bypasses custom limiter for /api/auth/* and limits /auth/*", async () => {
    const { enforceRateLimit } = await import("../src/modules/rate-limit/rate-limit.service");

    const app = new Elysia()
      .onBeforeHandle((ctx) => enforceRateLimit(ctx as any))
      .post("/api/auth/dummy", () => ({ ok: true }))
      .post("/api/auth/oauth2/token", () => ({ ok: true }))
      .post("/auth/dummy", () => ({ ok: true }));

    const apiAuthFirst = await app.handle(
      new Request("http://localhost/api/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.40",
        },
      }),
    );
    const apiAuthSecond = await app.handle(
      new Request("http://localhost/api/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.40",
        },
      }),
    );
    const apiAuthThird = await app.handle(
      new Request("http://localhost/api/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.40",
        },
      }),
    );

    expect(apiAuthFirst.status).toBe(200);
    expect(apiAuthSecond.status).toBe(200);
    expect(apiAuthThird.status).toBe(200);

    const tokenResponses = await Promise.all(
      [1, 2, 3].map(() =>
        app.handle(
          new Request("http://localhost/api/auth/oauth2/token", {
            method: "POST",
            headers: { "x-forwarded-for": "192.0.2.44" },
          }),
        ),
      ),
    );
    expect(tokenResponses.map((response) => response.status).sort()).toEqual([
      200,
      200,
      429,
    ]);

    const customAuthFirst = await app.handle(
      new Request("http://localhost/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "198.51.100.100",
        },
      }),
    );
    const customAuthSecond = await app.handle(
      new Request("http://localhost/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "198.51.100.100",
        },
      }),
    );
    const customAuthThird = await app.handle(
      new Request("http://localhost/auth/dummy", {
        method: "POST",
        headers: {
          "x-forwarded-for": "198.51.100.100",
        },
      }),
    );

    expect(customAuthFirst.status).toBe(200);
    expect(customAuthSecond.status).toBe(200);
    expect(customAuthThird.status).toBe(429);
    expect(await customAuthThird.json()).toEqual({
      message: "Too many requests",
      group: "auth",
      retryAfterSeconds: 60,
    });
    expect(customAuthThird.headers.get("retry-after")).toBe("60");
  });
});
