import prisma, { Prisma } from "@db/server";
import type { AdminInvitationQuery } from "./invitations.dto";

type InvitationListItem = {
  email: string;
  invitationCount: number;
  lastExpiresAt: string | null;
  status: "accepted" | "pending";
  acceptedUserName: string | null;
};

function normalizeDateRange(dateFrom?: string, dateTo?: string) {
  const range: { gte?: Date; lte?: Date } = {};

  if (dateFrom) {
    range.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    range.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  return range;
}

type InvitationGroupRow = {
  email: string;
  invitationCount: number;
  lastExpiresAt: Date | null;
  status: "accepted" | "pending";
  acceptedUserName: string | null;
};

type InvitationTotalRow = {
  total: number;
};

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 10, 1), 100);
  return {
    limit: normalizedLimit,
    requestedPage: Math.max(page ?? 1, 1),
  };
}

function buildBaseWhere(args: {
  search?: string;
  expiresAtRange: { gte?: Date; lte?: Date };
}) {
  const conditions: Prisma.Sql[] = [];

  if (args.search) {
    conditions.push(Prisma.sql`i.email ILIKE ${`%${args.search}%`}`);
  }

  if (args.expiresAtRange.gte) {
    conditions.push(Prisma.sql`i."expiresAt" >= ${args.expiresAtRange.gte}`);
  }

  if (args.expiresAtRange.lte) {
    conditions.push(Prisma.sql`i."expiresAt" <= ${args.expiresAtRange.lte}`);
  }

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

function buildStatusWhere(status?: "accepted" | "pending") {
  if (status === "accepted") {
    return Prisma.sql`WHERE "isAccepted" = true`;
  }

  if (status === "pending") {
    return Prisma.sql`WHERE "isAccepted" = false`;
  }

  return Prisma.empty;
}

function groupedInvitationsSql(baseWhere: Prisma.Sql, statusWhere: Prisma.Sql) {
  return Prisma.sql`
    WITH grouped AS (
      SELECT
        i.email,
        COUNT(*)::int AS "invitationCount",
        MAX(i."expiresAt") AS "lastExpiresAt",
        BOOL_OR(i.status = 'accepted') AS "isAccepted"
      FROM "invitation" i
      ${baseWhere}
      GROUP BY i.email
    ),
    filtered AS (
      SELECT *
      FROM grouped
      ${statusWhere}
    )
  `;
}

export class AdminInvitationsService {
  async listInvitations(query: AdminInvitationQuery) {
    const { search, status, dateFrom, dateTo } = query;
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const expiresAtRange = normalizeDateRange(dateFrom, dateTo);
    const baseWhere = buildBaseWhere({ search, expiresAtRange });
    const statusWhere = buildStatusWhere(status);

    const [{ total = 0 } = { total: 0 }] = await prisma.$queryRaw<
      InvitationTotalRow[]
    >(Prisma.sql`
      ${groupedInvitationsSql(baseWhere, statusWhere)}
      SELECT COUNT(*)::int AS total
      FROM filtered
    `);

    const pages = Math.max(1, Math.ceil(total / limit));
    const boundedPage = Math.min(requestedPage, pages);
    const skip = (boundedPage - 1) * limit;
    const rows = await prisma.$queryRaw<InvitationGroupRow[]>(Prisma.sql`
      ${groupedInvitationsSql(baseWhere, statusWhere)}
      SELECT
        f.email,
        f."invitationCount",
        f."lastExpiresAt",
        CASE WHEN f."isAccepted" THEN 'accepted' ELSE 'pending' END AS status,
        CASE WHEN f."isAccepted" THEN u.name ELSE NULL END AS "acceptedUserName"
      FROM filtered f
      LEFT JOIN "user" u ON lower(u.email) = lower(f.email)
      ORDER BY f."lastExpiresAt" DESC NULLS LAST, f.email ASC
      LIMIT ${limit}
      OFFSET ${skip}
    `);

    return {
      items: rows.map((row): InvitationListItem => ({
        email: row.email,
        invitationCount: row.invitationCount,
        lastExpiresAt: row.lastExpiresAt?.toISOString() ?? null,
        status: row.status,
        acceptedUserName: row.acceptedUserName,
      })),
      total,
      pages,
      page: boundedPage,
      limit,
    };
  }
}

export const adminInvitationsService = new AdminInvitationsService();
