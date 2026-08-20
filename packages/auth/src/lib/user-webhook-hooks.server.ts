import type { BetterAuthPlugin, User } from "better-auth";
import prisma from "../../../db/src/client.server";
import { enqueueUserWebhookDeliveries, toWebhookUser } from "../../../db/src/user-webhooks.server";

type AuthUser = Partial<User> & { id?: string };
const visibleUserFields = new Set([
  "name", "email", "emailVerified", "image", "banned", "archived",
]);
const visibleUpdates = new WeakMap<object, boolean>();

async function getWebhookUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, emailVerified: true, image: true, banned: true, archived: true },
  });
}

async function enqueueCreated(user: AuthUser) {
  if (!user.id) return;
  const current = await getWebhookUser(user.id);
  if (!current) return;
  await prisma.$transaction((tx) => enqueueUserWebhookDeliveries(tx, { eventType: "user.created", user: toWebhookUser(current) }));
}

async function trackVisibleUpdate(data: Record<string, unknown>, context: unknown) {
  if (context && typeof context === "object") {
    visibleUpdates.set(context, Object.keys(data).some((key) => visibleUserFields.has(key)));
  }
}

async function enqueueUpdated(user: AuthUser, context: unknown) {
  if (!user.id) return;
  if (!context || typeof context !== "object" || !visibleUpdates.get(context)) return;
  const current = await getWebhookUser(user.id);
  if (!current) return;
  await prisma.$transaction((tx) => enqueueUserWebhookDeliveries(tx, { eventType: "user.updated", user: toWebhookUser(current) }));
}

async function enqueueDeleted(user: AuthUser) {
  if (!user.id) return;
  await prisma.$transaction((tx) => enqueueUserWebhookDeliveries(tx, { eventType: "user.deleted", user: { id: user.id! } }));
}

/** Better Auth mutations use this hook; direct Prisma mutations enqueue explicitly. */
export function userWebhookHooks(): BetterAuthPlugin {
  return {
    id: "application-user-webhooks",
    init() {
      return { options: { databaseHooks: { user: {
        create: { after: enqueueCreated },
        update: { before: trackVisibleUpdate, after: enqueueUpdated },
        delete: { before: enqueueDeleted },
      } } } };
    },
  };
}
