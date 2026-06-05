import prisma, { Prisma } from "@db/server";
import type {
  VisitorsListQuery,
  VisitorsOverviewQuery,
} from "./visitors.dto";

type Segment = "humans" | "bots" | "all";
type VisitorType = "all" | "new" | "returning";

type NormalizedQuery = {
  from: Date;
  to: Date;
  segment: Segment;
  type: VisitorType;
};

type OverviewPoint = {
  date: string;
  visits: number;
  uniqueVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  botVisits: number;
};

type VisitorListItem = {
  visitorId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSeenInRange: string;
  visitsCount: number;
  lastPath: string;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  deviceType: string | null;
  country: string | null;
  isBot: boolean;
};

function normalizeDateRange(dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const to = dateTo
    ? new Date(`${dateTo}T23:59:59.999Z`)
    : new Date(now.toISOString().slice(0, 10) + "T23:59:59.999Z");

  const defaultFrom = new Date(to);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : defaultFrom;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    const fallbackTo = new Date(
      now.toISOString().slice(0, 10) + "T23:59:59.999Z",
    );
    const fallbackFrom = new Date(fallbackTo);
    fallbackFrom.setUTCDate(fallbackFrom.getUTCDate() - 29);
    fallbackFrom.setUTCHours(0, 0, 0, 0);

    return {
      from: fallbackFrom,
      to: fallbackTo,
    };
  }

  return { from, to };
}

function normalizeOverviewQuery(query: VisitorsOverviewQuery): NormalizedQuery {
  const { from, to } = normalizeDateRange(query.dateFrom, query.dateTo);

  return {
    from,
    to,
    segment: query.segment ?? "humans",
    type: query.type ?? "all",
  };
}

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  const normalizedPage = Math.max(page ?? 1, 1);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

function whereConditions(
  query: NormalizedQuery,
  options?: {
    sessionAlias?: string;
    identityAlias?: string;
    applyRange?: boolean;
    applyVisitType?: boolean;
  },
) {
  const sessionAlias = options?.sessionAlias ?? "s";
  const identityAlias = options?.identityAlias ?? "i";
  const applyRange = options?.applyRange ?? true;
  const applyVisitType = options?.applyVisitType ?? true;
  const conditions: Prisma.Sql[] = [];

  if (applyRange) {
    conditions.push(
      Prisma.sql`${Prisma.raw(sessionAlias)}."startedAt" >= ${query.from}`,
      Prisma.sql`${Prisma.raw(sessionAlias)}."startedAt" <= ${query.to}`,
    );
  }

  if (query.segment === "humans") {
    conditions.push(Prisma.sql`${Prisma.raw(sessionAlias)}."isBot" = false`);
  }

  if (query.segment === "bots") {
    conditions.push(Prisma.sql`${Prisma.raw(sessionAlias)}."isBot" = true`);
  }

  if (applyVisitType && query.type === "new") {
    conditions.push(
      Prisma.sql`${Prisma.raw(identityAlias)}."firstSeenAt" >= ${query.from}`,
      Prisma.sql`${Prisma.raw(identityAlias)}."firstSeenAt" <= ${query.to}`,
    );
  }

  if (applyVisitType && query.type === "returning") {
    conditions.push(
      Prisma.sql`${Prisma.raw(identityAlias)}."firstSeenAt" < ${query.from}`,
    );
  }

  return {
    hasConditions: conditions.length > 0,
    sql:
      conditions.length === 0
        ? Prisma.empty
        : Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`,
  };
}

function personTypeWhere(query: NormalizedQuery, personAlias = "p") {
  if (query.type === "new") {
    return Prisma.sql`WHERE ${Prisma.raw(personAlias)}."firstSeenAt" >= ${query.from}
      AND ${Prisma.raw(personAlias)}."firstSeenAt" <= ${query.to}`;
  }

  if (query.type === "returning") {
    return Prisma.sql`WHERE ${Prisma.raw(personAlias)}."firstSeenAt" < ${query.from}`;
  }

  return Prisma.empty;
}

function listDateRangeDays(from: Date, to: Date) {
  const items: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);

  while (cursor <= to) {
    items.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return items;
}

export class AdminVisitorsService {
  async getOverview(query: VisitorsOverviewQuery) {
    const normalized = normalizeOverviewQuery(query);
    const where = whereConditions(normalized, {
      applyVisitType: false,
    });
    const typedPersonsWhere = personTypeWhere(normalized, "p");

    type OverviewRow = {
      totalVisits: number;
      uniqueVisitors: number;
      newVisitors: number;
      returningVisitors: number;
      botVisits: number;
    };

    const [totalsRow] = await prisma.$queryRaw<OverviewRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          s.*,
          i."firstSeenAt",
          COALESCE(s."userId", s."visitorIdentityId") AS "personKey"
        FROM "visitor_session" s
        JOIN "visitor_identity" i ON i.id = s."visitorIdentityId"
        ${where.sql}
      ),
      persons AS (
        SELECT
          f."personKey",
          MIN(f."firstSeenAt") AS "firstSeenAt"
        FROM filtered f
        GROUP BY f."personKey"
      ),
      typed_persons AS (
        SELECT p."personKey"
        FROM persons p
        ${typedPersonsWhere}
      )
      SELECT
        COUNT(*)::int AS "totalVisits",
        COUNT(DISTINCT f."personKey")::int AS "uniqueVisitors",
        COUNT(DISTINCT CASE
          WHEN p."firstSeenAt" >= ${normalized.from}
            AND p."firstSeenAt" <= ${normalized.to}
          THEN f."personKey"
        END)::int AS "newVisitors",
        COUNT(DISTINCT CASE
          WHEN p."firstSeenAt" < ${normalized.from}
          THEN f."personKey"
        END)::int AS "returningVisitors",
        COUNT(*) FILTER (WHERE f."isBot" = true)::int AS "botVisits"
      FROM filtered f
      JOIN typed_persons tp ON tp."personKey" = f."personKey"
      JOIN persons p ON p."personKey" = f."personKey"
    `);

    const activeWhere = whereConditions(normalized, {
      applyRange: false,
      applyVisitType: false,
    });
    const activeTypedPersonsWhere = personTypeWhere(normalized, "p");

    type ActiveRow = {
      activeNow: number;
    };

    const [activeRow] = await prisma.$queryRaw<ActiveRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          s.*,
          i."firstSeenAt",
          COALESCE(s."userId", s."visitorIdentityId") AS "personKey"
        FROM "visitor_session" s
        JOIN "visitor_identity" i ON i.id = s."visitorIdentityId"
        ${activeWhere.sql}
        ${activeWhere.hasConditions ? Prisma.sql`AND` : Prisma.sql`WHERE`}
        s."lastSeenAt" >= ${new Date(Date.now() - 5 * 60 * 1000)}
      ),
      persons AS (
        SELECT
          f."personKey",
          MIN(f."firstSeenAt") AS "firstSeenAt"
        FROM filtered f
        GROUP BY f."personKey"
      )
      SELECT COUNT(*)::int AS "activeNow"
      FROM persons p
      ${activeTypedPersonsWhere}
    `);

    type SeriesRow = {
      day: Date;
      visits: number;
      uniqueVisitors: number;
      newVisitors: number;
      returningVisitors: number;
      botVisits: number;
    };

    const seriesRows = await prisma.$queryRaw<SeriesRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          s.*,
          i."firstSeenAt",
          COALESCE(s."userId", s."visitorIdentityId") AS "personKey"
        FROM "visitor_session" s
        JOIN "visitor_identity" i ON i.id = s."visitorIdentityId"
        ${where.sql}
      ),
      persons AS (
        SELECT
          f."personKey",
          MIN(f."firstSeenAt") AS "firstSeenAt"
        FROM filtered f
        GROUP BY f."personKey"
      ),
      typed_persons AS (
        SELECT p."personKey", p."firstSeenAt"
        FROM persons p
        ${typedPersonsWhere}
      )
      SELECT
        date_trunc('day', f."startedAt") AS day,
        COUNT(*)::int AS visits,
        COUNT(DISTINCT f."personKey")::int AS "uniqueVisitors",
        COUNT(DISTINCT CASE
          WHEN tp."firstSeenAt" >= date_trunc('day', f."startedAt")
            AND tp."firstSeenAt" < date_trunc('day', f."startedAt") + interval '1 day'
          THEN f."personKey"
        END)::int AS "newVisitors",
        COUNT(DISTINCT CASE
          WHEN tp."firstSeenAt" < date_trunc('day', f."startedAt")
          THEN f."personKey"
        END)::int AS "returningVisitors",
        COUNT(*) FILTER (WHERE f."isBot" = true)::int AS "botVisits"
      FROM filtered f
      JOIN typed_persons tp ON tp."personKey" = f."personKey"
      GROUP BY day
      ORDER BY day ASC
    `);

    const byDate = new Map<string, OverviewPoint>();
    for (const row of seriesRows) {
      const date = row.day.toISOString().slice(0, 10);
      byDate.set(date, {
        date,
        visits: row.visits,
        uniqueVisitors: row.uniqueVisitors,
        newVisitors: row.newVisitors,
        returningVisitors: row.returningVisitors,
        botVisits: row.botVisits,
      });
    }

    const series = listDateRangeDays(normalized.from, normalized.to).map(
      (date) =>
        byDate.get(date) ?? {
          date,
          visits: 0,
          uniqueVisitors: 0,
          newVisitors: 0,
          returningVisitors: 0,
          botVisits: 0,
        },
    );

    return {
      filters: {
        dateFrom: normalized.from.toISOString().slice(0, 10),
        dateTo: normalized.to.toISOString().slice(0, 10),
        segment: normalized.segment,
        type: normalized.type,
      },
      cards: {
        activeNow: activeRow?.activeNow ?? 0,
        totalVisits: totalsRow?.totalVisits ?? 0,
        uniqueVisitors: totalsRow?.uniqueVisitors ?? 0,
        newVisitors: totalsRow?.newVisitors ?? 0,
        returningVisitors: totalsRow?.returningVisitors ?? 0,
        botVisits: totalsRow?.botVisits ?? 0,
      },
      series,
    };
  }

  async listVisitors(query: VisitorsListQuery) {
    const normalized = normalizeOverviewQuery(query);
    const { page, limit } = normalizePagination(query.page, query.limit);
    const where = whereConditions(normalized, {
      applyVisitType: false,
    });
    const typedPersonsWhere = personTypeWhere(normalized, "p");

    type TotalRow = {
      total: number;
    };

    const [totalRow] = await prisma.$queryRaw<TotalRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          COALESCE(s."userId", s."visitorIdentityId") AS "personKey",
          i."firstSeenAt"
        FROM "visitor_session" s
        JOIN "visitor_identity" i ON i.id = s."visitorIdentityId"
        ${where.sql}
      ),
      persons AS (
        SELECT
          f."personKey",
          MIN(f."firstSeenAt") AS "firstSeenAt"
        FROM filtered f
        GROUP BY f."personKey"
      )
      SELECT COUNT(*)::int AS total
      FROM persons p
      ${typedPersonsWhere}
    `);

    const total = totalRow?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / limit));
    const boundedPage = Math.min(page, pages);
    const boundedSkip = (boundedPage - 1) * limit;

    type ListRow = {
      visitorId: string;
      firstSeenAt: Date;
      lastSeenAt: Date;
      lastSeenInRange: Date;
      visitsCount: number;
      lastPath: string;
      isLoggedIn: boolean;
      userName: string | null;
      userEmail: string | null;
      deviceType: string | null;
      country: string | null;
      isBot: boolean;
    };

    const rows = await prisma.$queryRaw<ListRow[]>(Prisma.sql`
      WITH filtered AS (
        SELECT
          s."visitorIdentityId",
          COALESCE(s."userId", s."visitorIdentityId") AS "personKey",
          s."lastSeenAt",
          s."lastPath",
          s."deviceType",
          s."country",
          s."isBot",
          s."userId",
          i."visitorId",
          i."firstSeenAt",
          i."lastSeenAt" AS "identityLastSeenAt"
        FROM "visitor_session" s
        JOIN "visitor_identity" i ON i.id = s."visitorIdentityId"
        ${where.sql}
      ),
      rollup AS (
        SELECT
          f."personKey",
          MIN(f."visitorId") AS "visitorId",
          MIN(f."firstSeenAt") AS "firstSeenAt",
          MAX(f."identityLastSeenAt") AS "lastSeenAt",
          MAX(f."lastSeenAt") AS "lastSeenInRange",
          COUNT(*)::int AS "visitsCount",
          BOOL_OR(f."userId" IS NOT NULL) AS "isLoggedIn"
        FROM filtered f
        GROUP BY f."personKey"
      ),
      typed_rollup AS (
        SELECT r.*
        FROM rollup r
        ${personTypeWhere(normalized, "r")}
      )
      SELECT
        r."visitorId",
        r."firstSeenAt",
        r."lastSeenAt",
        r."lastSeenInRange",
        r."visitsCount",
        latest."lastPath",
        r."isLoggedIn",
        latest."userName",
        latest."userEmail",
        latest."deviceType",
        latest."country",
        latest."isBot"
      FROM typed_rollup r
      LEFT JOIN LATERAL (
        SELECT
          f."lastPath",
          f."deviceType",
          f."country",
          f."isBot",
          u.name AS "userName",
          u.email AS "userEmail"
        FROM filtered f
        LEFT JOIN "user" u ON u.id = f."userId"
        WHERE f."personKey" = r."personKey"
        ORDER BY f."lastSeenAt" DESC
        LIMIT 1
      ) latest ON true
      ORDER BY r."lastSeenInRange" DESC
      LIMIT ${limit}
      OFFSET ${boundedSkip}
    `);

    return {
      filters: {
        dateFrom: normalized.from.toISOString().slice(0, 10),
        dateTo: normalized.to.toISOString().slice(0, 10),
        segment: normalized.segment,
        type: normalized.type,
      },
      items: rows.map((row): VisitorListItem => ({
        visitorId: row.visitorId,
        firstSeenAt: row.firstSeenAt.toISOString(),
        lastSeenAt: row.lastSeenAt.toISOString(),
        lastSeenInRange: row.lastSeenInRange.toISOString(),
        visitsCount: row.visitsCount,
        lastPath: row.lastPath,
        isLoggedIn: row.isLoggedIn,
        userName: row.userName,
        userEmail: row.userEmail,
        deviceType: row.deviceType,
        country: row.country,
        isBot: row.isBot,
      })),
      total,
      pages,
      page: boundedPage,
      limit,
    };
  }
}

export const adminVisitorsService = new AdminVisitorsService();
