import { describe, expect, it } from "bun:test";
import {
  attachCapturedOAuthProfileOnCreate,
  namespaceOAuthAccountId,
  stageOAuthProfile,
} from "../../../packages/auth/src/lib/oauth-profile.server";

describe("OAuth provider profile persistence", () => {
  it("namespaces the same upstream account by connection", () => {
    expect(namespaceOAuthAccountId("connection-a", "user-1")).not.toBe(
      namespaceOAuthAccountId("connection-b", "user-1"),
    );
  });

  it("stores the complete provider profile on account creation", async () => {
    const rawProfile = {
      sub: "google-user-1",
      name: "OAuth User",
      email: "oauth-user@example.test",
      picture: "https://example.test/avatar.png",
      locale: "en",
      nested: { providerValue: true },
    };
    stageOAuthProfile(
      "google",
      rawProfile,
      "google-connection-1",
      "google-user-1",
    );

    const result = attachCapturedOAuthProfileOnCreate({
      id: "account-1",
      accountId: "google-connection-1:google-user-1",
      providerId: "google",
      userId: "user-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result && typeof result === "object" && "data" in result).toBe(true);
    expect((result as { data: Record<string, unknown> }).data.rawProfile).toEqual(
      rawProfile,
    );
    expect(
      (result as { data: Record<string, unknown> }).data.profileUpdatedAt,
    ).toBeInstanceOf(Date);
    expect(
      (result as { data: Record<string, unknown> }).data
        .oauthProviderConnectionId,
    ).toBe("google-connection-1");
  });

  it("does not attach one provider profile to another provider account", async () => {
    stageOAuthProfile(
      "github",
      {
        id: 123,
        avatar_url: "https://example.test/github.png",
      },
      "github-connection-1",
      "123",
    );

    const result = attachCapturedOAuthProfileOnCreate({
      id: "account-2",
      accountId: "google-user-2",
      providerId: "google",
      userId: "user-2",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result).toBeUndefined();
  });

  for (const provider of [
    "google",
    "github",
    "facebook",
    "linkedin",
  ] as const) {
    it(`retains the raw ${provider} profile on its connection-scoped account`, () => {
      const connectionId = `${provider}-connection`;
      const providerAccountId = `${provider}-user`;
      const profile = {
        id: providerAccountId,
        email: `${provider}@example.test`,
        avatar: `https://example.test/${provider}.png`,
      };
      stageOAuthProfile(
        provider,
        profile,
        connectionId,
        providerAccountId,
      );

      const result = attachCapturedOAuthProfileOnCreate({
        providerId: provider,
        accountId: `${connectionId}:${providerAccountId}`,
      });
      expect(result?.data.rawProfile).toEqual(profile);
      expect(result?.data.oauthProviderConnectionId).toBe(connectionId);
    });
  }
});
