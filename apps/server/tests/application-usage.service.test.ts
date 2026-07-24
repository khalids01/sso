import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const usageCreate = mock(async (args: unknown) => args);
const usageDeleteMany = mock(async () => ({ count: 2 }));

mock.module("@db/server", () => ({
  default: {
    applicationUsageEvent: {
      create: usageCreate,
      deleteMany: usageDeleteMany,
    },
  },
  Prisma,
}));

const {
  cleanupExpiredApplicationUsage,
  recordApplicationUsage,
} = await import(
  "../src/modules/application-usage/application-usage.service"
);

describe("application usage recording", () => {
  beforeEach(() => {
    usageCreate.mockClear();
    usageDeleteMany.mockClear();
  });

  it("records typed application context without storing a raw IP", async () => {
    await recordApplicationUsage({
      type: "login",
      outcome: "success",
      userId: "user-1",
      applicationId: "app-1",
      applicationClientId: "client-1",
      authMethod: "password",
      requestId: "request-1",
      reason: "authenticated",
      request: new Request("https://sso.example.test/auth/password/login", {
        headers: {
          "x-forwarded-for": "203.0.113.9",
          "user-agent": "E2E browser",
        },
      }),
    });

    const data = (usageCreate.mock.calls[0]![0] as { data: Record<string, unknown> })
      .data;
    expect(data).toMatchObject({
      type: "login",
      outcome: "success",
      userId: "user-1",
      applicationId: "app-1",
      applicationClientId: "client-1",
      authMethod: "password",
      requestId: "request-1",
      reason: "authenticated",
      userAgent: "E2E browser",
    });
    expect(data.ipHash).toBeString();
    expect(data.ipHash).not.toBe("203.0.113.9");
  });

  it("removes detailed events older than 180 days", async () => {
    await cleanupExpiredApplicationUsage();
    const cutoff = (
      usageDeleteMany.mock.calls[0]![0] as {
        where: { createdAt: { lt: Date } };
      }
    ).where.createdAt.lt;
    const ageDays = (Date.now() - cutoff.getTime()) / 86_400_000;
    expect(ageDays).toBeGreaterThanOrEqual(179.99);
    expect(ageDays).toBeLessThan(181);
  });
});
