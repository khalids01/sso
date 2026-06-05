import prisma from "@db/server";

const POLAR_PROVIDER = "polar";
const PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;

type PolarWebhookPayload = {
  type: string;
  data?: Record<string, unknown> | null;
};

type ProcessWebhookInput = {
  eventId: string;
  payload: PolarWebhookPayload;
  handler: () => Promise<void>;
};

type WebhookProcessResult =
  | { processed: true }
  | { processed: false; duplicate: true };

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function claimWebhookEvent(input: {
  eventId: string;
  eventType: string;
}) {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: POLAR_PROVIDER,
        eventId: input.eventId,
        eventType: input.eventType,
        status: "processing",
      },
    });

    return true;
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: POLAR_PROVIDER,
          eventId: input.eventId,
        },
      },
      select: {
        status: true,
        updatedAt: true,
      },
    });

    if (!existing) {
      return false;
    }

    const isStaleProcessing =
      existing.status === "processing" &&
      existing.updatedAt.getTime() < Date.now() - PROCESSING_TIMEOUT_MS;

    if (existing.status !== "failed" && !isStaleProcessing) {
      return false;
    }

    await prisma.webhookEvent.update({
      where: {
        provider_eventId: {
          provider: POLAR_PROVIDER,
          eventId: input.eventId,
        },
      },
      data: {
        eventType: input.eventType,
        status: "processing",
        errorMessage: null,
        attemptCount: {
          increment: 1,
        },
      },
    });

    return true;
  }
}

async function markWebhookEventProcessed(eventId: string) {
  await prisma.webhookEvent.update({
    where: {
      provider_eventId: {
        provider: POLAR_PROVIDER,
        eventId,
      },
    },
    data: {
      status: "processed",
      processedAt: new Date(),
      errorMessage: null,
    },
  });
}

async function markWebhookEventFailed(eventId: string, error: unknown) {
  await prisma.webhookEvent.update({
    where: {
      provider_eventId: {
        provider: POLAR_PROVIDER,
        eventId,
      },
    },
    data: {
      status: "failed",
      errorMessage: errorMessage(error).slice(0, 1_000),
    },
  });
}

export async function processPolarWebhookOnce(
  input: ProcessWebhookInput,
): Promise<WebhookProcessResult> {
  const claimed = await claimWebhookEvent({
    eventId: input.eventId,
    eventType: input.payload.type,
  });

  if (!claimed) {
    console.log(`Duplicate Polar webhook skipped: ${input.eventId}`);
    return {
      processed: false,
      duplicate: true,
    };
  }

  try {
    await input.handler();
    await markWebhookEventProcessed(input.eventId);

    return {
      processed: true,
    };
  } catch (error) {
    await markWebhookEventFailed(input.eventId, error);
    throw error;
  }
}

export async function handlePolarPayload(payload: PolarWebhookPayload) {
  const customerId =
    typeof payload.data?.customerId === "string"
      ? payload.data.customerId
      : "unknown";

  switch (payload.type) {
    case "subscription.created":
    case "subscription.updated":
    case "subscription.active":
      console.log(`${payload.type} for ${customerId}`);
      break;
    case "subscription.revoked":
    case "subscription.canceled":
      console.log(`${payload.type} for ${customerId}`);
      break;
    default:
      console.log(`Unhandled event type: ${payload.type}`);
  }
}
