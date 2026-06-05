import prisma, { type Prisma } from "@db/server";
import { Roles } from "@rbac";
import type { ActivityQuery, ActivitySeverity } from "./activity.dto";

type ActivityUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

type ActivityItem = {
  id: string;
  type: string;
  actorUserId: string | null;
  targetUserId: string | null;
  visitorId: string | null;
  severity: ActivitySeverity;
  message: string;
  metadata: Prisma.JsonValue | null;
  createdAt: string;
  actorUser: ActivityUser | null;
  targetUser: ActivityUser | null;
};

type ActivityRecordInput = {
  type: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  visitorId?: string | null;
  severity?: ActivitySeverity;
  message: string;
  metadata?: Prisma.InputJsonValue | null;
};

const activityUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  rbacRoles: {
    take: 1,
    select: {
      role: {
        select: {
          slug: true,
        },
      },
    },
  },
};

function mapActivityUser(
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    rbacRoles: Array<{ role: { slug: string } }>;
  } | null,
): ActivityUser | null {
  if (!user) {
    return null;
  }

  const { rbacRoles, ...rest } = user;

  return {
    ...rest,
    role: rbacRoles[0]?.role.slug ?? Roles.PlatformUser,
  };
}

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  return {
    limit: normalizedLimit,
    requestedPage: Math.max(page ?? 1, 1),
  };
}

export class ActivityService {
  async record(input: ActivityRecordInput) {
    try {
      return await prisma.activityEvent.create({
        data: {
          type: input.type,
          actorUserId: input.actorUserId ?? null,
          targetUserId: input.targetUserId ?? null,
          visitorId: input.visitorId ?? null,
          severity: input.severity ?? "info",
          message: input.message,
          metadata: input.metadata ?? undefined,
        },
      });
    } catch (error) {
      console.error("Activity event recording failed", error);
      return null;
    }
  }

  async list(query: ActivityQuery) {
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.ActivityEventWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    const total = await prisma.activityEvent.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.activityEvent.findMany({
      where,
      select: {
        id: true,
        type: true,
        actorUserId: true,
        targetUserId: true,
        visitorId: true,
        severity: true,
        message: true,
        metadata: true,
        createdAt: true,
        actorUser: { select: activityUserSelect },
        targetUser: { select: activityUserSelect },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map((row): ActivityItem => ({
        id: row.id,
        type: row.type,
        actorUserId: row.actorUserId,
        targetUserId: row.targetUserId,
        visitorId: row.visitorId,
        severity: row.severity as ActivitySeverity,
        message: row.message,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        actorUser: mapActivityUser(row.actorUser),
        targetUser: mapActivityUser(row.targetUser),
      })),
      total,
      pages,
      page,
      limit,
    };
  }
}

export const activityService = new ActivityService();
