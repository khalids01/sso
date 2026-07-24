import prisma, { Prisma } from "@db/server";
import type {
  ApplicationUsageEventsQuery,
  ApplicationUsageOverviewQuery,
} from "./application-usage.dto";

function dateRange(dateFrom?: string, dateTo?: string) {
  const end = dateTo
    ? new Date(`${dateTo}T23:59:59.999Z`)
    : new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999Z`);
  const start = dateFrom
    ? new Date(`${dateFrom}T00:00:00.000Z`)
    : new Date(end.getTime() - 29 * 86_400_000);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

function buildWhere(query: ApplicationUsageOverviewQuery) {
  const { start, end } = dateRange(query.dateFrom, query.dateTo);
  const where: Prisma.ApplicationUsageEventWhereInput = {
    createdAt: { gte: start, lte: end },
    ...(query.applicationId ? { applicationId: query.applicationId } : {}),
    ...(query.applicationClientId
      ? { applicationClientId: query.applicationClientId }
      : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.outcome ? { outcome: query.outcome } : {}),
    ...(query.authMethod ? { authMethod: query.authMethod } : {}),
    ...(query.user
      ? {
          user: {
            OR: [
              { id: query.user },
              { name: { contains: query.user, mode: "insensitive" as const } },
              { email: { contains: query.user, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };
  return { where, start, end };
}

function sqlConditions(query: ApplicationUsageOverviewQuery) {
  const { start, end } = dateRange(query.dateFrom, query.dateTo);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`e."createdAt" >= ${start}`,
    Prisma.sql`e."createdAt" <= ${end}`,
  ];
  if (query.applicationId) {
    conditions.push(Prisma.sql`e."applicationId" = ${query.applicationId}`);
  }
  if (query.applicationClientId) {
    conditions.push(
      Prisma.sql`e."applicationClientId" = ${query.applicationClientId}`,
    );
  }
  if (query.type) conditions.push(Prisma.sql`e."type"::text = ${query.type}`);
  if (query.outcome) {
    conditions.push(Prisma.sql`e."outcome"::text = ${query.outcome}`);
  }
  if (query.authMethod) {
    conditions.push(Prisma.sql`e."authMethod"::text = ${query.authMethod}`);
  }
  if (query.user) {
    const search = `%${query.user}%`;
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "user" u
      WHERE u.id = e."userId"
        AND (u.id = ${query.user} OR u.name ILIKE ${search} OR u.email ILIKE ${search})
    )`);
  }
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export class AdminApplicationUsageService {
  async getOverview(query: ApplicationUsageOverviewQuery) {
    const { where, start, end } = buildWhere(query);
    const successful = { ...where, outcome: "success" as const };
    const [
      totalEvents,
      deniedEvents,
      signups,
      logins,
      tokenIssuances,
      users,
      applications,
      series,
      filterApplications,
    ] = await Promise.all([
      prisma.applicationUsageEvent.count({ where }),
      prisma.applicationUsageEvent.count({
        where: { ...where, outcome: "denied" },
      }),
      prisma.applicationUsageEvent.count({
        where: { ...successful, type: "signup" },
      }),
      prisma.applicationUsageEvent.count({
        where: { ...successful, type: "login" },
      }),
      prisma.applicationUsageEvent.count({
        where: { ...successful, type: "token" },
      }),
      prisma.applicationUsageEvent.groupBy({
        by: ["userId"],
        where: { ...where, userId: { not: null } },
      }),
      prisma.applicationUsageEvent.groupBy({
        by: ["applicationId"],
        where: { ...successful, applicationId: { not: null } },
      }),
      prisma.$queryRaw<
        Array<{
          date: Date;
          events: number;
          uniqueUsers: number;
          signups: number;
          logins: number;
          tokens: number;
          denied: number;
        }>
      >(Prisma.sql`
        SELECT
          date_trunc('day', e."createdAt") AS "date",
          COUNT(*)::int AS "events",
          COUNT(DISTINCT e."userId")::int AS "uniqueUsers",
          COUNT(*) FILTER (WHERE e."type"::text = 'signup' AND e."outcome"::text = 'success')::int AS "signups",
          COUNT(*) FILTER (WHERE e."type"::text = 'login' AND e."outcome"::text = 'success')::int AS "logins",
          COUNT(*) FILTER (WHERE e."type"::text = 'token' AND e."outcome"::text = 'success')::int AS "tokens",
          COUNT(*) FILTER (WHERE e."outcome"::text = 'denied')::int AS "denied"
        FROM "application_usage_event" e
        ${sqlConditions(query)}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.application.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          clients: {
            orderBy: { name: "asc" },
            select: { id: true, name: true, clientId: true },
          },
        },
      }),
    ]);

    return {
      range: { from: start.toISOString(), to: end.toISOString() },
      metrics: {
        totalEvents,
        uniqueUsers: users.length,
        signups,
        logins,
        tokenIssuances,
        activeApplications: applications.length,
        denialRate:
          totalEvents === 0 ? 0 : Math.round((deniedEvents / totalEvents) * 10_000) / 100,
      },
      series: series.map((point) => ({
        ...point,
        date: point.date.toISOString().slice(0, 10),
      })),
      filterOptions: { applications: filterApplications },
    };
  }

  async listEvents(query: ApplicationUsageEventsQuery) {
    const { where } = buildWhere(query);
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const requestedPage = Math.max(query.page ?? 1, 1);
    const total = await prisma.applicationUsageEvent.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.applicationUsageEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        application: { select: { id: true, name: true, slug: true } },
        applicationClient: {
          select: { id: true, clientId: true, name: true },
        },
        oauthProviderConnection: {
          select: { id: true, name: true, provider: true },
        },
      },
    });
    return {
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      pages,
      page,
      limit,
    };
  }
}

export const adminApplicationUsageService =
  new AdminApplicationUsageService();
