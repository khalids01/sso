import { describe, expect, mock, test } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const cache = new Map<string, string>();
const redis = {
  async getdel(key: string) {
    const value = cache.get(key) ?? null;
    cache.delete(key);
    return value;
  },
};
const assignmentFindFirst = mock(async (): Promise<any> => null);
const applicationClientFindFirst = mock(async (): Promise<any> => null);

mock.module("@db/server", () => ({
  default: {
    applicationOAuthProviderConnection: {
      findFirst: assignmentFindFirst,
    },
    applicationClient: {
      findFirst: applicationClientFindFirst,
    },
  },
  Prisma,
}));

mock.module("@redis/server", () => ({
  connectRedis: mock(async () => redis),
  getRedis: () => redis,
  getCache: mock(async (key: string) => {
    const value = cache.get(key);
    return value ? JSON.parse(value) : null;
  }),
  setCache: mock(async (key: string, value: unknown) => {
    cache.set(key, JSON.stringify(value));
  }),
  deleteCache: mock(async (key: string) => {
    cache.delete(key);
  }),
}));

const credentials = await import(
  "../src/modules/auth/social-provider-credentials.service"
);

describe("OAuth provider connection credentials", () => {
  test("encrypts secrets with authenticated encryption", () => {
    const encrypted =
      credentials.encryptSocialProviderSecret("provider-secret");
    expect(encrypted).not.toContain("provider-secret");
    expect(credentials.decryptSocialProviderSecret(encrypted)).toBe(
      "provider-secret",
    );

    const parts = encrypted.split(".");
    parts[3] = `${parts[3]!.slice(0, -1)}A`;
    expect(() =>
      credentials.decryptSocialProviderSecret(parts.join(".")),
    ).toThrow();
  });

  test("keeps concurrent states independent and consumes each once", async () => {
    const base = {
      provider: "google" as const,
      applicationId: "app-1",
      applicationClientId: "client-row-1",
      downstreamClientId: "sso-client-1",
      oauthProviderConnectionId: "connection-1",
      credentialVersion: 1,
      intent: "login" as const,
      requestId: "request-1",
    };
    await Promise.all([
      credentials.storeSocialProviderContext("state-a", base),
      credentials.storeSocialProviderContext("state-b", base),
    ]);

    expect(
      await credentials.consumeSocialProviderContext("state-a"),
    ).toMatchObject(base);
    expect(
      await credentials.consumeSocialProviderContext("state-a"),
    ).toBeNull();
    expect(
      await credentials.consumeSocialProviderContext("state-b"),
    ).toMatchObject(base);
  });

  test("rejects callbacks after reassignment or a credential version change", async () => {
    const context = {
      provider: "google" as const,
      applicationId: "app-1",
      applicationClientId: "client-row-1",
      downstreamClientId: "sso-client-1",
      oauthProviderConnectionId: "connection-1",
      credentialVersion: 1,
      intent: "login" as const,
      requestId: "request-1",
      expiresAt: Date.now() + 60_000,
    };
    assignmentFindFirst.mockResolvedValue({
      oauthProviderConnection: {
        id: "connection-1",
        provider: "google",
        clientId: "google-client",
        encryptedSecret:
          credentials.encryptSocialProviderSecret("google-secret"),
        credentialVersion: 2,
        status: "active",
      },
    });

    expect(
      await credentials.getOAuthProviderConnectionForCallback(context),
    ).toBeNull();
    expect(
      JSON.stringify(assignmentFindFirst.mock.calls.at(-1)),
    ).toContain("connection-1");
  });

  test("two downstream clients resolve the same application connection", async () => {
    applicationClientFindFirst.mockImplementation(async (args: any) => ({
      clientId: args.where.clientId,
      applicationId: "app-1",
      application: {
        oauthProviderConnections: [
          {
            oauthProviderConnection: {
              id: "connection-1",
              provider: "google",
              clientId: "google-client",
              encryptedSecret:
                credentials.encryptSocialProviderSecret("google-secret"),
              credentialVersion: 1,
              status: "active",
            },
          },
        ],
      },
    }));

    const [first, second] = await Promise.all([
      credentials.getApplicationSocialProviderConnection(
        "sso-client-1",
        "google",
      ),
      credentials.getApplicationSocialProviderConnection(
        "sso-client-2",
        "google",
      ),
    ]);
    expect(first?.connection.id).toBe("connection-1");
    expect(second?.connection.id).toBe("connection-1");
  });
});
