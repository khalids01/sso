import { describe, expect, test } from "bun:test";
import {
  createSsoBetterAuthProvider,
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
    const provider = createSsoBetterAuthProvider({
      clientId: "client_123",
      baseUrl: "https://sso.example.com",
      forceLogin: true,
    });

    expect(provider.prompt).toBe("login");
  });

  test("allows the central SSO session by default", () => {
    expect(createSsoBetterAuthProvider({
      clientId: "client_123",
      baseUrl: "https://sso.example.com",
    }).prompt).toBeUndefined();
  });

  test("requires an explicit Better Auth SSO base URL", () => {
    expect(() => createSsoBetterAuthProvider({
      clientId: "client_123",
      baseUrl: "",
    })).toThrow("baseUrl is required");
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
