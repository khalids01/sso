import { afterEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const queryRawMock = mock(async (): Promise<any> => []);
const invitationGroupByMock = mock(async () => {
  throw new Error("invitation.groupBy should not be used");
});
const userFindManyMock = mock(async () => {
  throw new Error("user.findMany should not be used");
});

mock.module("@db/server", () => ({
  default: {
    $queryRaw: queryRawMock,
    invitation: {
      groupBy: invitationGroupByMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
  Prisma,
}));

afterEach(() => {
  queryRawMock.mockReset();
  invitationGroupByMock.mockReset();
  userFindManyMock.mockReset();
});

describe("AdminInvitationsService", () => {
  it("returns paginated invitation groups from database-level queries", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ total: 25 }])
      .mockResolvedValueOnce([
        {
          email: "accepted@example.com",
          invitationCount: 3,
          lastExpiresAt: new Date("2026-01-03T00:00:00.000Z"),
          status: "accepted",
          acceptedUserName: "Accepted User",
        },
        {
          email: "pending@example.com",
          invitationCount: 1,
          lastExpiresAt: null,
          status: "pending",
          acceptedUserName: null,
        },
      ]);

    const { adminInvitationsService } = await import(
      "../src/modules/admin/invitations/invitations.service"
    );

    const result = await adminInvitationsService.listInvitations({
      page: 2,
      limit: 10,
      search: "example",
      status: "accepted",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(queryRawMock).toHaveBeenCalledTimes(2);
    expect(invitationGroupByMock).not.toHaveBeenCalled();
    expect(userFindManyMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [
        {
          email: "accepted@example.com",
          invitationCount: 3,
          lastExpiresAt: "2026-01-03T00:00:00.000Z",
          status: "accepted",
          acceptedUserName: "Accepted User",
        },
        {
          email: "pending@example.com",
          invitationCount: 1,
          lastExpiresAt: null,
          status: "pending",
          acceptedUserName: null,
        },
      ],
      total: 25,
      pages: 3,
      page: 2,
      limit: 10,
    });
  });

  it("bounds page and limit before running the page query", async () => {
    queryRawMock.mockResolvedValueOnce([{ total: 1 }]).mockResolvedValueOnce([]);

    const { adminInvitationsService } = await import(
      "../src/modules/admin/invitations/invitations.service"
    );

    const result = await adminInvitationsService.listInvitations({
      page: -10,
      limit: 1_000,
    });

    expect(result).toMatchObject({
      total: 1,
      pages: 1,
      page: 1,
      limit: 100,
    });
  });
});
