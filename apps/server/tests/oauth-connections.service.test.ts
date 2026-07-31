import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const connectionCreate = mock(async (args: any) => ({
  id: "connection-1",
  name: args.data.name,
  provider: args.data.provider,
  clientId: args.data.clientId,
  encryptedSecret: args.data.encryptedSecret,
  credentialVersion: 1,
  status: args.data.status,
  createdAt: new Date("2026-07-24T00:00:00.000Z"),
  updatedAt: new Date("2026-07-24T00:00:00.000Z"),
  _count: { applicationAssignments: 0, accounts: 0 },
}));
const connectionFindUnique = mock(async (): Promise<any> => null);
const connectionDelete = mock(async () => ({}));
const activityCreate = mock(async () => ({}));

mock.module("@sso/db/server", () => ({
  default: {
    oAuthProviderConnection: {
      create: connectionCreate,
      findUnique: connectionFindUnique,
      delete: connectionDelete,
    },
    activityEvent: { create: activityCreate },
  },
  Prisma,
}));

mock.module("@sso/env/server", () => ({
  env: {
    BETTER_AUTH_SECRET: "test-better-auth-secret-that-is-long-enough",
    NODE_ENV: "test",
  },
}));

const { OAuthConnectionsPolicyError, OAuthConnectionsService } = await import(
  "../src/modules/admin/oauth-connections/oauth-connections.service"
);
const { decryptSocialProviderSecret, encryptSocialProviderSecret } =
  await import("../src/modules/auth/social-provider-credentials.service");

describe("OAuthConnectionsService", () => {
  beforeEach(() => {
    connectionCreate.mockClear();
    connectionFindUnique.mockReset();
    connectionDelete.mockClear();
    activityCreate.mockClear();
  });

  it("encrypts credentials and never returns the secret from create", async () => {
    const service = new OAuthConnectionsService();
    const result = await service.create(
      {
        name: " Production Google ",
        provider: "google",
        clientId: " google-client ",
        clientSecret: "google-secret",
        status: "active",
      },
      { id: "owner-1" },
    );

    const stored = connectionCreate.mock.calls[0]![0].data;
    expect(stored.encryptedSecret).not.toContain("google-secret");
    expect(decryptSocialProviderSecret(stored.encryptedSecret)).toBe(
      "google-secret",
    );
    expect(JSON.stringify(result)).not.toContain("google-secret");
    expect(activityCreate).toHaveBeenCalledTimes(1);
  });

  it("reveals a secret only through the dedicated operation and audits it", async () => {
    connectionFindUnique.mockResolvedValue({
      id: "connection-1",
      name: "Production Google",
      provider: "google",
      encryptedSecret: encryptSocialProviderSecret("google-secret"),
    });
    const service = new OAuthConnectionsService();

    await expect(
      service.revealSecret("connection-1", { id: "owner-1" }),
    ).resolves.toEqual({ clientSecret: "google-secret" });
    expect(
      JSON.stringify(activityCreate.mock.calls.at(-1)),
    ).toContain("oauth_connection.secret_revealed");
  });

  it("blocks permanent deletion while assignments remain", async () => {
    connectionFindUnique.mockResolvedValue({
      id: "connection-1",
      name: "Production Google",
      provider: "google",
      clientId: "google-client",
      credentialVersion: 1,
      status: "archived",
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { applicationAssignments: 1, accounts: 0 },
    });
    const service = new OAuthConnectionsService();

    await expect(
      service.deletePermanent("connection-1", { id: "owner-1" }),
    ).rejects.toBeInstanceOf(OAuthConnectionsPolicyError);
    expect(connectionDelete).not.toHaveBeenCalled();
  });
});
