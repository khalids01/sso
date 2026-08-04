import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { createSsoBetterAuthIntegration } from "../src/index.js";
import { createSsoBetterAuthReact, SsoProvider, useSsoSession } from "../src/react/index.js";
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

    function User() {
      const { user, status } = useSsoSession();
      return createElement("span", null, `${status}:${user?.email}`);
    }

    const html = renderToString(createElement(
      SsoProvider,
      { bootstrap },
      createElement(User),
    ));
    expect(html).toContain("authenticated:test@example.com");
  });
});
