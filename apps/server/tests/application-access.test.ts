import { describe, expect, it, mock } from "bun:test";

import { getApplicationClientAccess } from "../../../packages/db/src/application-access.server";

function createDb(result: unknown) {
  return {
    applicationClient: {
      findUnique: mock(async () => result),
    },
  } as any;
}

function createClient(overrides: Record<string, unknown> = {}) {
  return {
    clientId: "sso_client_1",
    name: "Browser client",
    status: "active",
    oauthDisabled: false,
    application: {
      id: "app-1",
      name: "Dashboard",
      status: "active",
      members: [
        {
          id: "member-1",
          status: "active",
          user: { archived: false, banned: false },
        },
      ],
    },
    ...overrides,
  };
}

describe("getApplicationClientAccess", () => {
  it("allows an active user, membership, application, and client", async () => {
    const result = await getApplicationClientAccess(
      "user-1",
      "sso_client_1",
      createDb(createClient()),
    );

    expect(result).toEqual({
      allowed: true,
      applicationId: "app-1",
      applicationName: "Dashboard",
      clientId: "sso_client_1",
      clientName: "Browser client",
      memberId: "member-1",
    });
  });

  it("denies an inactive OAuth client", async () => {
    const result = await getApplicationClientAccess(
      "user-1",
      "sso_client_1",
      createDb(createClient({ oauthDisabled: true })),
    );

    expect(result).toMatchObject({
      allowed: false,
      reason: "client_inactive",
    });
  });

  it("denies an inactive application", async () => {
    const client = createClient();
    client.application.status = "archived";

    const result = await getApplicationClientAccess(
      "user-1",
      "sso_client_1",
      createDb(client),
    );

    expect(result).toMatchObject({
      allowed: false,
      reason: "application_inactive",
    });
  });

  it("denies missing, suspended, and revoked memberships", async () => {
    for (const status of [undefined, "suspended", "revoked"] as const) {
      const client = createClient();
      client.application.members = status
        ? [
            {
              id: "member-1",
              status,
              user: { archived: false, banned: false },
            },
          ]
        : [];

      const result = await getApplicationClientAccess(
        "user-1",
        "sso_client_1",
        createDb(client),
      );

      expect(result).toMatchObject({
        allowed: false,
        reason: status ? "membership_inactive" : "membership_missing",
      });
    }
  });

  it("denies banned and archived users", async () => {
    for (const user of [
      { archived: false, banned: true },
      { archived: true, banned: false },
    ]) {
      const client = createClient();
      client.application.members[0]!.user = user;

      const result = await getApplicationClientAccess(
        "user-1",
        "sso_client_1",
        createDb(client),
      );

      expect(result).toMatchObject({
        allowed: false,
        reason: "user_inactive",
      });
    }
  });
});
