import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const webhookCountMock = mock(async () => 0);
const webhookFindManyMock = mock(async (): Promise<any> => []);

mock.module("@db/server", () => ({
  default: {
    webhookEvent: {
      count: webhookCountMock,
      findMany: webhookFindManyMock,
    },
  },
  Prisma,
}));

beforeEach(() => {
  webhookCountMock.mockResolvedValue(0);
  webhookFindManyMock.mockResolvedValue([]);
});

afterEach(() => {
  webhookCountMock.mockReset();
  webhookFindManyMock.mockReset();
});

describe("AdminWebhooksService", () => {
  it("lists webhook events newest first", async () => {
    webhookCountMock.mockResolvedValueOnce(1);
    webhookFindManyMock.mockResolvedValueOnce([
      {
        id: "webhook-1",
        provider: "polar",
        eventId: "evt_1",
        eventType: "subscription.created",
        status: "processed",
        attemptCount: 1,
        errorMessage: null,
        processedAt: new Date("2026-04-27T09:00:00.000Z"),
        createdAt: new Date("2026-04-27T08:59:00.000Z"),
        updatedAt: new Date("2026-04-27T09:00:00.000Z"),
      },
    ]);

    const { adminWebhooksService } = await import(
      "../src/modules/admin/webhooks/webhooks.service"
    );

    const result = await adminWebhooksService.list({ page: 1, limit: 20 });

    expect(webhookFindManyMock).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        provider: true,
        eventId: true,
        eventType: true,
        status: true,
        attemptCount: true,
        errorMessage: true,
        processedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
    expect(result.items[0]).toMatchObject({
      eventId: "evt_1",
      processedAt: "2026-04-27T09:00:00.000Z",
      createdAt: "2026-04-27T08:59:00.000Z",
      updatedAt: "2026-04-27T09:00:00.000Z",
    });
  });

  it("filters by status and event type", async () => {
    const { adminWebhooksService } = await import(
      "../src/modules/admin/webhooks/webhooks.service"
    );

    await adminWebhooksService.list({
      page: 1,
      limit: 20,
      status: "failed",
      eventType: "subscription.revoked",
    });

    expect(webhookCountMock).toHaveBeenCalledWith({
      where: {
        status: "failed",
        eventType: "subscription.revoked",
      },
    });
  });

  it("bounds pagination", async () => {
    webhookCountMock.mockResolvedValueOnce(5);

    const { adminWebhooksService } = await import(
      "../src/modules/admin/webhooks/webhooks.service"
    );

    const result = await adminWebhooksService.list({ page: 999, limit: 1000 });

    expect(webhookFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(result).toMatchObject({
      total: 5,
      pages: 1,
      page: 1,
      limit: 100,
    });
  });
});

