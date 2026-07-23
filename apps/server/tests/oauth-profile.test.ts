import { describe, expect, it } from "bun:test";
import {
  attachCapturedOAuthProfileOnCreate,
  stageOAuthProfile,
} from "../../../packages/auth/src/lib/oauth-profile.server";

describe("OAuth provider profile persistence", () => {
  it("stores the complete provider profile on account creation", async () => {
    const rawProfile = {
      sub: "google-user-1",
      name: "OAuth User",
      email: "oauth-user@example.test",
      picture: "https://example.test/avatar.png",
      locale: "en",
      nested: { providerValue: true },
    };
    stageOAuthProfile("google", rawProfile);

    const result = attachCapturedOAuthProfileOnCreate({
      id: "account-1",
      accountId: "google-user-1",
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
  });

  it("does not attach one provider profile to another provider account", async () => {
    stageOAuthProfile("github", {
      id: 123,
      avatar_url: "https://example.test/github.png",
    });

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
});
