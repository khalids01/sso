import { describe, expect, it } from "bun:test";
import { toClientSession } from "./session.client";

describe("toClientSession", () => {
  it("keeps the profile image in the safe client session", () => {
    const session = toClientSession({
      user: {
        id: "user-1",
        name: "GitHub User",
        email: "user@example.com",
        image: "https://avatars.githubusercontent.com/u/1?v=4",
        banned: false,
        banReason: null,
        archived: false,
        onboardingComplete: true,
        plan: "free",
        subscriptionStatus: null,
      },
      session: {
        id: "session-1",
        userId: "user-1",
        token: "secret-token",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      permissions: [],
      roles: [],
      primaryRoleSlug: "platform.user",
      primaryRoleId: null,
    });

    expect(session?.user.image).toBe(
      "https://avatars.githubusercontent.com/u/1?v=4",
    );
    expect(session).not.toHaveProperty("session");
  });
});
