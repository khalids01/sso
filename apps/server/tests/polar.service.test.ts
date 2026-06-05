import { afterEach, describe, expect, it, mock } from "bun:test";

type WebhookEvent = {
  provider: string;
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  processedAt: Date | null;
  updatedAt: Date;
};

const events = new Map<string, WebhookEvent>();

function key(provider: string, eventId: string) {
  return `${provider}:${eventId}`;
}

const webhookEventMock = {
  create: mock(async ({ data }: any) => {
    const eventKey = key(data.provider, data.eventId);
    if (events.has(eventKey)) {
      const error = new Error("Unique constraint failed") as Error & {
        code: string;
      };
      error.code = "P2002";
      throw error;
    }

    const event: WebhookEvent = {
      provider: data.provider,
      eventId: data.eventId,
      eventType: data.eventType,
      status: data.status,
      attemptCount: 1,
      errorMessage: null,
      processedAt: null,
      updatedAt: new Date(),
    };
    events.set(eventKey, event);
    return event;
  }),
  findUnique: mock(async ({ where, select }: any) => {
    const event = events.get(
      key(where.provider_eventId.provider, where.provider_eventId.eventId),
    );
    if (!event) {
      return null;
    }

    if (select) {
      return {
        ...(select.status ? { status: event.status } : {}),
        ...(select.updatedAt ? { updatedAt: event.updatedAt } : {}),
      };
    }

    return event;
  }),
  update: mock(async ({ where, data }: any) => {
    const eventKey = key(
      where.provider_eventId.provider,
      where.provider_eventId.eventId,
    );
    const current = events.get(eventKey);
    if (!current) {
      throw new Error("event not found");
    }

    const next: WebhookEvent = {
      ...current,
      eventType: data.eventType ?? current.eventType,
      status: data.status ?? current.status,
      errorMessage:
        data.errorMessage === undefined ? current.errorMessage : data.errorMessage,
      processedAt:
        data.processedAt === undefined ? current.processedAt : data.processedAt,
      updatedAt: new Date(),
      attemptCount:
        typeof data.attemptCount?.increment === "number"
          ? current.attemptCount + data.attemptCount.increment
          : current.attemptCount,
    };
    events.set(eventKey, next);
    return next;
  }),
};

mock.module("@db/server", () => ({
  default: {
    webhookEvent: webhookEventMock,
  },
}));

afterEach(() => {
  events.clear();
  webhookEventMock.create.mockClear();
  webhookEventMock.findUnique.mockClear();
  webhookEventMock.update.mockClear();
});

describe("polar webhook service", () => {
  it("processes a webhook once and marks it processed", async () => {
    const { processPolarWebhookOnce } = await import(
      "../src/modules/polar/polar.service"
    );
    const handler = mock(async () => {});

    const result = await processPolarWebhookOnce({
      eventId: "evt_1",
      payload: { type: "subscription.created" },
      handler,
    });

    expect(result).toEqual({ processed: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(events.get("polar:evt_1")?.status).toBe("processed");
    expect(events.get("polar:evt_1")?.processedAt).toBeInstanceOf(Date);
  });

  it("skips duplicate processed webhook events", async () => {
    const { processPolarWebhookOnce } = await import(
      "../src/modules/polar/polar.service"
    );
    const handler = mock(async () => {});

    await processPolarWebhookOnce({
      eventId: "evt_1",
      payload: { type: "subscription.created" },
      handler,
    });
    const result = await processPolarWebhookOnce({
      eventId: "evt_1",
      payload: { type: "subscription.created" },
      handler,
    });

    expect(result).toEqual({ processed: false, duplicate: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("marks failed webhooks and allows a retry", async () => {
    const { processPolarWebhookOnce } = await import(
      "../src/modules/polar/polar.service"
    );
    const failingHandler = mock(async () => {
      throw new Error("boom");
    });
    const retryHandler = mock(async () => {});

    await expect(
      processPolarWebhookOnce({
        eventId: "evt_1",
        payload: { type: "subscription.created" },
        handler: failingHandler,
      }),
    ).rejects.toThrow("boom");

    expect(events.get("polar:evt_1")?.status).toBe("failed");

    const result = await processPolarWebhookOnce({
      eventId: "evt_1",
      payload: { type: "subscription.updated" },
      handler: retryHandler,
    });

    expect(result).toEqual({ processed: true });
    expect(retryHandler).toHaveBeenCalledTimes(1);
    expect(events.get("polar:evt_1")?.attemptCount).toBe(2);
    expect(events.get("polar:evt_1")?.status).toBe("processed");
  });
});
