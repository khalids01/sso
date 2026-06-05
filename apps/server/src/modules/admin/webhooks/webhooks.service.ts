import prisma, { type Prisma } from "@db/server";
import type { WebhookEventsQuery } from "./webhooks.dto";

type WebhookEventItem = {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  return {
    limit: normalizedLimit,
    requestedPage: Math.max(page ?? 1, 1),
  };
}

export class AdminWebhooksService {
  async list(query: WebhookEventsQuery) {
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.WebhookEventWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    const total = await prisma.webhookEvent.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.webhookEvent.findMany({
      where,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map((row): WebhookEventItem => ({
        ...row,
        processedAt: row.processedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      total,
      pages,
      page,
      limit,
    };
  }
}

export const adminWebhooksService = new AdminWebhooksService();

