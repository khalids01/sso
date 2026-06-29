import { connectRedis } from "../../redis/src/index.server";
import prisma from "./client.server";
import { invalidateUser } from "./rbac/cache/invalidate.server";

export const SESSION_CACHE_VERSION_PREFIX = "auth:session-version:";

export type SessionDevice = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
};

function sessionCacheVersionKey(userId: string) {
  return `${SESSION_CACHE_VERSION_PREFIX}${userId}`;
}

export async function getUserSessionCacheVersion(userId: string) {
  const redis = await connectRedis();
  return (await redis.get(sessionCacheVersionKey(userId))) ?? "0";
}

export async function bumpUserSessionCacheVersion(userId: string) {
  const redis = await connectRedis();
  const version = await redis.incr(sessionCacheVersionKey(userId));
  await invalidateUser(userId);
  return String(version);
}

export async function listUserSessionDevices(
  userId: string,
  currentSessionId?: string,
): Promise<SessionDevice[]> {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      ipAddress: true,
      userAgent: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return sessions.map((session) => ({
    ...session,
    isCurrent: session.id === currentSessionId,
  }));
}

export async function revokeSessionById(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });

  if (!session) {
    return null;
  }

  await prisma.session.delete({
    where: { id: session.id },
  });
  await bumpUserSessionCacheVersion(session.userId);

  return session;
}

export async function revokeUserSessionDevice(
  userId: string,
  sessionId: string,
  currentSessionId: string,
) {
  if (sessionId === currentSessionId) {
    throw new Error("Current device cannot be logged out from this view");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });

  if (!session || session.userId !== userId) {
    throw new Error("Session not found");
  }

  await prisma.session.delete({
    where: { id: session.id },
  });
  await bumpUserSessionCacheVersion(userId);

  return session;
}

export async function revokeUserSessionsExcept(
  userId: string,
  currentSessionId: string,
) {
  const result = await prisma.session.deleteMany({
    where: {
      userId,
      id: {
        not: currentSessionId,
      },
    },
  });

  if (result.count > 0) {
    await bumpUserSessionCacheVersion(userId);
  }

  return result;
}

export async function revokeAllUserSessions(userId: string) {
  const result = await prisma.session.deleteMany({
    where: { userId },
  });

  if (result.count > 0) {
    await bumpUserSessionCacheVersion(userId);
  }

  return result;
}
