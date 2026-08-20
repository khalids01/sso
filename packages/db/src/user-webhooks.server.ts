import { randomUUID } from "node:crypto";
import type { Prisma } from "../prisma/generated/client";

export const USER_WEBHOOK_EVENTS = [
  "user.created",
  "user.updated",
  "user.deleted",
] as const;

export type UserWebhookEventType = (typeof USER_WEBHOOK_EVENTS)[number];
export const USER_WEBHOOK_DELIVERY_TTL_MS = 24 * 60 * 60 * 1_000;

type Transaction = Prisma.TransactionClient;

export type WebhookUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  banned: boolean;
  archived: boolean;
};

export function toWebhookUser(user: WebhookUser): WebhookUser {
  return { ...user };
}

/** Writes an outbox row only. The server worker performs the network delivery. */
export async function enqueueUserWebhookDeliveries(
  tx: Transaction,
  input: { eventType: UserWebhookEventType; user: WebhookUser | { id: string } },
) {
  const applicationIds = new Set<string>();
  const [memberships, subjects] = await Promise.all([
    tx.applicationMember.findMany({
      where: { userId: input.user.id, status: "active" },
      select: { applicationId: true },
    }),
    tx.applicationSubject.findMany({
      where: { userId: input.user.id },
      select: { applicationId: true },
    }),
  ]);
  for (const row of memberships) applicationIds.add(row.applicationId);
  for (const row of subjects) applicationIds.add(row.applicationId);
  if (applicationIds.size === 0) return [];

  const endpoints = await tx.applicationWebhookEndpoint.findMany({
    where: {
      applicationId: { in: [...applicationIds] },
      enabled: true,
      subscribedEvents: { has: input.eventType },
      application: { status: "active" },
    },
    select: { id: true, applicationId: true, url: true },
  });
  const createdAt = new Date().toISOString();
  const deadlineAt = new Date(Date.now() + USER_WEBHOOK_DELIVERY_TTL_MS);
  return Promise.all(endpoints.map((endpoint) => {
    const id = `evt_${randomUUID()}`;
    return tx.applicationWebhookDelivery.create({
      data: {
        id,
        applicationId: endpoint.applicationId,
        endpointId: endpoint.id,
        destinationUrl: endpoint.url,
        eventType: input.eventType,
        payload: { id, type: input.eventType, createdAt, data: input.user },
        deadlineAt,
      },
    });
  }));
}
