import { describe, expect, test } from "bun:test";
import {
  createSsoBetterAuthIntegration,
  getSsoEndpoints,
  safeReturnTo,
} from "../src/index.js";
import { createSsoAuthorization } from "../src/server/index.js";

describe("shared helpers", () => {
  test("builds canonical endpoints", () => {
    const endpoints = getSsoEndpoints("https://sso.example.com/path");
    expect(endpoints.authorization).toBe("https://sso.example.com/api/auth/oauth2/authorize");
    expect(endpoints.clientMetadata("client 1")).toBe(
      "https://sso.example.com/api/oauth/client-metadata?client_id=client+1",
    );
  });

  test("only accepts local return paths", () => {
    expect(safeReturnTo("/dashboard")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/");
    expect(safeReturnTo("https://evil.example")).toBe("/");
  });

  test("can configure Better Auth to require fresh SSO authentication", () => {
    const provider = createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "https://sso.example.com",
      forceLogin: true,
    });

    expect(provider.provider.prompt).toBe("login");
  });

  test("allows the central SSO session by default", () => {
    expect(createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "https://sso.example.com",
    }).provider.prompt).toBeUndefined();
  });

  test("requires an explicit Better Auth SSO URL", () => {
    expect(() => createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "",
    })).toThrow("ssoUrl is required");
  });

  test("creates a serializable Better Auth bootstrap without server functions", () => {
    const integration = createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "https://sso.example.com/path",
    });
    const bootstrap = integration.createBootstrap({
      user: { id: "user_123", role: "admin" },
      session: { id: "session_123" },
    });

    expect(integration.provider.providerId).toBe("skycanvas");
    expect(bootstrap).toEqual({
      kind: "better-auth",
      config: {
        providerId: "skycanvas",
        clientId: "client_123",
        baseUrl: "https://sso.example.com",
      },
      session: {
        user: { id: "user_123", role: "admin" },
        session: { id: "session_123" },
      },
    });
    expect(JSON.stringify(bootstrap)).not.toContain("fetch");
    expect(() => createSsoBetterAuthIntegration({
      clientId: "client_123",
      baseUrl: "not-a-url",
    })).toThrow("SSO ssoUrl must be a valid absolute URL");
  });

  test("accepts the minimal Better Auth option names", () => {
    const integration = createSsoBetterAuthIntegration({
      publishableKey: "client_123",
      ssoUrl: "http://localhost:5001",
    });

    expect(integration.provider.clientId).toBe("client_123");
    expect(integration.config.baseUrl).toBe("http://localhost:5001");
  });

  test("provides a one-call Better Auth plugin", async () => {
    const { skycanvas } = await import("../src/better-auth/index.js");
    const plugin = skycanvas({
      publishableKey: "client_123",
      ssoUrl: "https://sso.example.com",
    });

    expect(plugin.id).toBe("generic-oauth");
    expect(plugin.provider.providerId).toBe("skycanvas");
    expect(plugin.createBootstrap(null).config.clientId).toBe("client_123");
  });
});

describe("server authorization", () => {
  test("creates an authorization-code PKCE request", async () => {
    const { url, flow } = await createSsoAuthorization({
      clientId: "client_123",
      redirectUri: "https://app.example.com/auth/callback",
      baseUrl: "https://sso.example.com",
      returnTo: "/account",
    });

    expect(url.pathname).toBe("/api/auth/oauth2/authorize");
    expect(url.searchParams.get("client_id")).toBe("client_123");
    expect(url.searchParams.get("scope")).toBe("openid");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toHaveLength(43);
    expect(flow.verifier.length).toBeGreaterThanOrEqual(43);
    expect(flow.returnTo).toBe("/account");
  });
});
