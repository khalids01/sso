import { afterEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const queryRawMock = mock(async (_query?: unknown): Promise<any> => []);

mock.module("@db/server", () => ({
  default: {
    $queryRaw: queryRawMock,
  },
  Prisma,
}));

afterEach(() => {
  queryRawMock.mockReset();
});

function sqlText(value: unknown) {
  const sql = value as { strings?: string[]; sql?: string };
  return sql.strings?.join(" ") ?? sql.sql ?? String(value);
}

describe("AdminVisitorsService", () => {
  it("maps logged-in visitor identity fields (name/email) in list response", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          visitorId: "visitor-1",
          firstSeenAt: new Date("2026-04-20T10:00:00.000Z"),
          lastSeenAt: new Date("2026-04-25T12:00:00.000Z"),
          lastSeenInRange: new Date("2026-04-25T12:00:00.000Z"),
          visitsCount: 3,
          lastPath: "/pricing",
          isLoggedIn: true,
          userName: "Owner User",
          userEmail: "owner@example.com",
          deviceType: "desktop",
          country: "BD",
          isBot: false,
        },
      ]);

    const { adminVisitorsService } = await import(
      "../src/modules/admin/visitors/visitors.service"
    );

    const result = await adminVisitorsService.listVisitors({
      page: 1,
      limit: 20,
      segment: "humans",
      type: "all",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-25",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(result.items[0]).toMatchObject({
      visitorId: "visitor-1",
      isLoggedIn: true,
      userName: "Owner User",
      userEmail: "owner@example.com",
    });
  });

  it("returns null user identity fields for anonymous visitors", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          visitorId: "visitor-2",
          firstSeenAt: new Date("2026-04-25T10:00:00.000Z"),
          lastSeenAt: new Date("2026-04-25T10:10:00.000Z"),
          lastSeenInRange: new Date("2026-04-25T10:10:00.000Z"),
          visitsCount: 1,
          lastPath: "/",
          isLoggedIn: false,
          userName: null,
          userEmail: null,
          deviceType: "mobile",
          country: null,
          isBot: false,
        },
      ]);

    const { adminVisitorsService } = await import(
      "../src/modules/admin/visitors/visitors.service"
    );

    const result = await adminVisitorsService.listVisitors({
      page: 1,
      limit: 20,
      segment: "humans",
      type: "all",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-25",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(result.items[0]).toMatchObject({
      visitorId: "visitor-2",
      isLoggedIn: false,
      userName: null,
      userEmail: null,
    });
  });

  it("uses stable person keys for overview counts", async () => {
    queryRawMock
      .mockResolvedValueOnce([
        {
          totalVisits: 3,
          uniqueVisitors: 1,
          newVisitors: 1,
          returningVisitors: 0,
          botVisits: 0,
        },
      ])
      .mockResolvedValueOnce([{ activeNow: 1 }])
      .mockResolvedValueOnce([]);

    const { adminVisitorsService } = await import(
      "../src/modules/admin/visitors/visitors.service"
    );

    const result = await adminVisitorsService.getOverview({
      segment: "humans",
      type: "all",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-25",
    });

    expect(result.cards).toMatchObject({
      totalVisits: 3,
      uniqueVisitors: 1,
      newVisitors: 1,
      returningVisitors: 0,
    });

    const overviewSql = sqlText(queryRawMock.mock.calls[0]?.[0]);
    const activeSql = sqlText(queryRawMock.mock.calls[1]?.[0]);
    const seriesSql = sqlText(queryRawMock.mock.calls[2]?.[0]);

    expect(overviewSql).toContain('COALESCE(s."userId", s."visitorIdentityId")');
    expect(activeSql).toContain('COALESCE(s."userId", s."visitorIdentityId")');
    expect(seriesSql).toContain('COALESCE(s."userId", s."visitorIdentityId")');
  });

  it("groups list rows by stable person key instead of raw visitor identity", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          visitorId: "visitor-1",
          firstSeenAt: new Date("2026-04-20T10:00:00.000Z"),
          lastSeenAt: new Date("2026-04-25T12:00:00.000Z"),
          lastSeenInRange: new Date("2026-04-25T12:00:00.000Z"),
          visitsCount: 3,
          lastPath: "/",
          isLoggedIn: true,
          userName: "Khalid Khan",
          userEmail: "khalid@example.com",
          deviceType: "desktop",
          country: "BD",
          isBot: false,
        },
      ]);

    const { adminVisitorsService } = await import(
      "../src/modules/admin/visitors/visitors.service"
    );

    const result = await adminVisitorsService.listVisitors({
      page: 1,
      limit: 20,
      segment: "humans",
      type: "all",
      dateFrom: "2026-04-01",
      dateTo: "2026-04-25",
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      visitsCount: 3,
      userName: "Khalid Khan",
    });

    const totalSql = sqlText(queryRawMock.mock.calls[0]?.[0]);
    const listSql = sqlText(queryRawMock.mock.calls[1]?.[0]);

    expect(totalSql).toContain('COALESCE(s."userId", s."visitorIdentityId")');
    expect(listSql).toContain('GROUP BY f."personKey"');
    expect(listSql).toContain('WHERE f."personKey" = r."personKey"');
  });
});
