import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const countMock = mock(async () => 0);
const groupByMock = mock(async (): Promise<any[]> => []);
const findManyMock = mock(async (): Promise<any[]> => []);
const applicationFindManyMock = mock(async (): Promise<any[]> => []);
const queryRawMock = mock(async (): Promise<any[]> => []);

mock.module("@sso/db/server", () => ({
  default: {
    applicationUsageEvent: {
      count: countMock,
      groupBy: groupByMock,
      findMany: findManyMock,
    },
    application: {
      findMany: applicationFindManyMock,
    },
    $queryRaw: queryRawMock,
  },
  Prisma,
}));

const { AdminApplicationUsageService } = await import(
  "../src/modules/admin/application-usage/application-usage.service"
);

describe("AdminApplicationUsageService", () => {
  beforeEach(() => {
    countMock.mockReset();
    groupByMock.mockReset();
    findManyMock.mockReset();
    applicationFindManyMock.mockReset();
    queryRawMock.mockReset();
  });

  test("aggregates filtered usage metrics and denial rate", async () => {
    countMock
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(5);
    groupByMock
      .mockResolvedValueOnce([{ userId: "user-1" }, { userId: "user-2" }])
      .mockResolvedValueOnce([{ applicationId: "app-1" }]);
    queryRawMock.mockResolvedValue([
      {
        date: new Date("2026-07-24T00:00:00.000Z"),
        events: 20,
        uniqueUsers: 2,
        signups: 4,
        logins: 8,
        tokens: 5,
        denied: 3,
      },
    ]);
    applicationFindManyMock.mockResolvedValue([
      { id: "app-1", name: "Portal", clients: [] },
    ]);

    const result = await new AdminApplicationUsageService().getOverview({
      dateFrom: "2026-07-01",
      dateTo: "2026-07-24",
      applicationId: "app-1",
      outcome: "success",
    });

    expect(result.metrics).toEqual({
      totalEvents: 20,
      uniqueUsers: 2,
      signups: 4,
      logins: 8,
      tokenIssuances: 5,
      activeApplications: 1,
      denialRate: 15,
    });
    expect(result.series[0]?.date).toBe("2026-07-24");
    expect(JSON.stringify(countMock.mock.calls[0])).toContain("app-1");
  });

  test("paginates event results and includes linked display data", async () => {
    countMock.mockResolvedValue(21);
    findManyMock.mockResolvedValue([
      {
        id: "usage-1",
        type: "token",
        outcome: "success",
        createdAt: new Date("2026-07-24T08:00:00.000Z"),
        user: {
          id: "user-1",
          name: "Khalid",
          email: "khalid@example.com",
          image: null,
        },
        application: { id: "app-1", name: "Portal", slug: "portal" },
        applicationClient: {
          id: "client-1",
          clientId: "public-client",
          name: "Web",
        },
        oauthProviderConnection: null,
      },
    ]);

    const result = await new AdminApplicationUsageService().listEvents({
      page: 2,
      limit: 20,
      user: "khalid@example.com",
      authMethod: "password",
    });

    expect(result.page).toBe(2);
    expect(result.pages).toBe(2);
    expect(result.items[0]?.createdAt).toBe("2026-07-24T08:00:00.000Z");
    expect(findManyMock.mock.calls[0]?.[0]).toMatchObject({
      skip: 20,
      take: 20,
    });
    expect(JSON.stringify(findManyMock.mock.calls[0])).toContain(
      "khalid@example.com",
    );
  });
});
