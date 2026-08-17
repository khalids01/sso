import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { createSsoBetterAuthIntegration } from "../src/index.js";
import { completeAuthInteraction } from "../src/react/auth-completion.js";
import { createSsoBetterAuthReact, SsoProvider, SsoUserMenu, UserProfile } from "../src/react/index.js";
import type { StandaloneSsoBootstrap } from "../src/server/index.js";

describe("SSR React providers", () => {
  test("hydrates the inferred Better Auth session from bootstrap data", () => {
    const session = {
      user: { id: "user_123", name: "Test User", email: "test@example.com", role: "admin" },
      session: { id: "session_123" },
    };
    const authClient = {
      useSession: () => ({ data: null, isPending: true, error: null }),
      signIn: { oauth2: async () => ({}) },
      signOut: async () => ({}),
    };
    const integration = createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "https://sso.example.com",
    });
    const react = createSsoBetterAuthReact<typeof session>(authClient);

    function User() {
      const { user, status } = react.useSso();
      return createElement("span", null, `${status}:${user?.role}`);
    }

    const html = renderToString(createElement(
      react.SsoProvider,
      { bootstrap: integration.createBootstrap(session) },
      createElement(User),
    ));
    expect(html).toContain("authenticated:admin");
    expect(() => renderToString(createElement(User))).toThrow(
      "useSso requires the SsoProvider returned by createSsoBetterAuthReact",
    );
  });

  test("standalone SsoProvider consumes bootstrap without a client prop", () => {
    const bootstrap: StandaloneSsoBootstrap = {
      kind: "standalone",
      session: {
        user: {
          id: "user_123",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          image: null,
        },
        expiresAt: Date.now() + 60_000,
      },
      client: {
        baseUrl: "https://app.example.com",
        loginPath: "/auth/login",
        profilePath: "/auth/profile",
        logoutPath: "/auth/logout",
      },
    };

    const html = renderToString(createElement(
      SsoProvider,
      { bootstrap },
      createElement(SsoUserMenu),
    ));
    expect(html).toContain('aria-label="Open account menu"');
  });

  test("UserProfile provides content and labelled dialog modes", () => {
    const bootstrap: StandaloneSsoBootstrap = {
      kind: "standalone",
      session: null,
      client: {
        baseUrl: "https://app.example.com",
        loginPath: "/auth/login",
        profilePath: "/auth/profile",
        userProfilePath: "/auth/user-profile",
        logoutPath: "/auth/logout",
      },
    };
    const content = renderToString(createElement(
      SsoProvider,
      { bootstrap },
      createElement(UserProfile, { mode: "content" }),
    ));
    const dialog = renderToString(createElement(
      SsoProvider,
      { bootstrap },
      createElement(UserProfile, {
        mode: "dialog",
        label: createElement("span", null, "Open profile"),
      }),
    ));
    expect(content).toContain("Loading profile");
    expect(dialog).toContain("Open profile");
  });
});

describe("packaged auth completion", () => {
  const session = {
    user: {
      id: "user_123",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: null,
    },
    expiresAt: Date.now() + 60_000,
  };

  test("navigates to the safe return path after authentication", () => {
    let destination = "";
    completeAuthInteraction(session, "/admin", undefined, (path) => {
      destination = path;
    });
    expect(destination).toBe("/admin");
  });

  test("lets onSuccess control navigation and rejects external return paths", () => {
    let completed = false;
    let destination = "";
    completeAuthInteraction(session, "/admin", () => {
      completed = true;
    }, (path) => {
      destination = path;
    });
    expect(completed).toBe(true);
    expect(destination).toBe("");

    completeAuthInteraction(session, "https://evil.example", undefined, (path) => {
      destination = path;
    });
    expect(destination).toBe("/");
  });
});
