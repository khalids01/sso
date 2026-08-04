import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  createSsoAuthorization,
  createSsoServer,
  finishSsoAuthorization,
  type SsoAuthorizationFlow,
} from "../src/server/index.js";

const clientId = "client_test";
const audience = "app_test";
const subject = "user_test";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig", kid: "test-key" };
let expectedNonce = "";
let identityNonce = "";
let tokenRequestBody = "";
let tokenRequestCount = 0;
let issuer = "";

const issuerServer = Bun.serve({
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/oauth/client-metadata") {
      return Response.json({
        client_id: clientId,
        application_id: "application_test",
        audience,
        issuer,
      });
    }
    if (url.pathname === "/api/auth/jwks") return Response.json({ keys: [jwk] });
    if (url.pathname === "/api/auth/oauth2/token") {
      tokenRequestCount += 1;
      tokenRequestBody = await request.text();
      const accessToken = await sign({ scope: "openid" }, audience);
      const idToken = await sign({
        nonce: identityNonce,
        name: "Test User",
        email: "test@example.com",
        email_verified: true,
        picture: "https://example.com/avatar.png",
      }, clientId);
      return Response.json({
        access_token: accessToken,
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 600,
        scope: "openid",
      });
    }
    return new Response(null, { status: 404 });
  },
});

beforeAll(() => {
  issuer = `http://127.0.0.1:${issuerServer.port}`;
});

afterAll(() => issuerServer.stop(true));

describe("authorization callback verification", () => {
  test("requests fresh authentication when reauthentication is required", async () => {
    const { url } = await createSsoAuthorization({
      clientId,
      redirectUri: "https://app.example.com/auth/callback",
      baseUrl: issuer,
      forceLogin: true,
    });

    expect(url.searchParams.get("prompt")).toBe("login");
  });

  test("exchanges and verifies a valid authorization response", async () => {
    const { flow } = await newFlow();
    expectedNonce = flow.nonce;
    identityNonce = expectedNonce;

    const result = await finishSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: flow.state,
      flow,
      baseUrl: issuer,
    });

    expect(result.user).toEqual({
      id: subject,
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
      image: "https://example.com/avatar.png",
    });
    expect(result.returnTo).toBe("/dashboard");
    const body = new URLSearchParams(tokenRequestBody);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe(flow.verifier);
    expect(body.get("redirect_uri")).toBe(flow.redirectUri);
  });

  test("rejects a state mismatch before exchanging the code", async () => {
    const { flow } = await newFlow();
    await expect(finishSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: "wrong_state",
      flow,
      baseUrl: issuer,
    })).rejects.toThrow("state mismatch");
  });

  test("rejects an expired authorization flow", async () => {
    const { flow } = await newFlow();
    const expiredFlow: SsoAuthorizationFlow = { ...flow, createdAt: Date.now() - 601_000 };
    await expect(finishSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: expiredFlow.state,
      flow: expiredFlow,
      baseUrl: issuer,
    })).rejects.toThrow("flow expired");
  });

  test("rejects an ID token with the wrong nonce", async () => {
    const { flow } = await newFlow();
    expectedNonce = flow.nonce;
    identityNonce = "wrong_nonce";
    await expect(finishSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: flow.state,
      flow,
      baseUrl: issuer,
    })).rejects.toThrow("nonce mismatch");
  });
});

describe("framework-independent SSO server", () => {
  test("coalesces concurrent retries of the same callback", async () => {
    const sso = createSsoServer({
      clientId,
      appUrl: "https://app.example.com",
      baseUrl: issuer,
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
    });
    const login = await sso.login(new Request(
      "https://app.example.com/auth/login?returnTo=/dashboard",
    ));
    const authorizationUrl = new URL(requiredHeader(login, "location"));
    const state = requiredParam(authorizationUrl, "state");
    const flowCookie = cookiePair(requiredHeader(login, "set-cookie"));
    identityNonce = requiredParam(authorizationUrl, "nonce");
    const requestsBefore = tokenRequestCount;
    const callbackUrl = `https://app.example.com/auth/callback?code=authorization_code&state=${state}`;

    const [first, second] = await Promise.all([
      sso.callback(new Request(callbackUrl, { headers: { cookie: flowCookie } })),
      sso.callback(new Request(callbackUrl, { headers: { cookie: flowCookie } })),
    ]);

    expect(first.status).toBe(303);
    expect(second.status).toBe(303);
    expect(tokenRequestCount - requestsBefore).toBe(1);
  });

  test("owns login, callback, session, profile, and logout routes", async () => {
    const sso = createSsoServer({
      clientId,
      appUrl: "https://app.example.com",
      baseUrl: issuer,
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
    });

    const login = await sso.handle(new Request(
      "https://app.example.com/auth/login?returnTo=/dashboard",
    ));
    expect(login.status).toBe(303);
    const authorizationUrl = new URL(requiredHeader(login, "location"));
    identityNonce = requiredParam(authorizationUrl, "nonce");
    const flowCookie = cookiePair(requiredHeader(login, "set-cookie"));

    const callback = await sso.handle(new Request(
      `https://app.example.com/auth/callback?code=authorization_code&state=${requiredParam(authorizationUrl, "state")}`,
      { headers: { cookie: flowCookie } },
    ));
    expect(callback.status).toBe(303);
    expect(callback.headers.get("location")).toBe("https://app.example.com/dashboard");
    const sessionCookie = callback.headers.getSetCookie()
      .map(cookiePair)
      .find((cookie) => cookie.startsWith("sso_session="));
    expect(sessionCookie).toBeDefined();

    const profile = await sso.handle(new Request("https://app.example.com/auth/profile", {
      headers: { cookie: sessionCookie ?? "" },
    }));
    expect(profile.status).toBe(200);
    expect((await profile.json()).user.email).toBe("test@example.com");

    const bootstrap = await sso.getBootstrap(new Headers({ cookie: sessionCookie ?? "" }));
    expect(bootstrap.kind).toBe("standalone");
    expect(bootstrap.session?.user.email).toBe("test@example.com");
    expect(bootstrap.client).toEqual({
      baseUrl: "https://app.example.com",
      loginPath: "/auth/login",
      profilePath: "/auth/profile",
      logoutPath: "/auth/logout",
    });
    expect(JSON.stringify(bootstrap)).not.toContain("test-session-secret");

    const rejectedLogout = await sso.handle(new Request("https://app.example.com/auth/logout", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    }));
    expect(rejectedLogout.status).toBe(403);

    const logout = await sso.handle(new Request("https://app.example.com/auth/logout", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    }));
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");

    const globalLogout = await sso.handle(new Request(
      "https://app.example.com/auth/logout?global=true&returnTo=/signed-out",
    ));
    expect(globalLogout.status).toBe(303);
    const globalLogoutUrl = new URL(requiredHeader(globalLogout, "location"));
    expect(globalLogoutUrl.pathname).toBe("/api/auth/global-sign-out");
    expect(globalLogoutUrl.searchParams.get("client_id")).toBe(clientId);
    expect(globalLogoutUrl.searchParams.get("return_to")).toBe(
      "https://app.example.com/signed-out",
    );

    const freshLogin = await sso.handle(new Request(
      "https://app.example.com/auth/login?returnTo=/dashboard&forceLogin=true",
    ));
    expect(new URL(requiredHeader(freshLogin, "location")).searchParams.get("prompt"))
      .toBe("login");
  });

  test("rejects insecure cross-site cookies", () => {
    expect(() => createSsoServer({
      clientId,
      appUrl: "http://localhost:3000",
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
      cookies: { sameSite: "none" },
    })).toThrow("must be Secure");
  });

  test("reports actionable server configuration errors", () => {
    expect(() => createSsoServer({
      clientId,
      appUrl: "not-a-url",
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
    })).toThrow("SSO appUrl must be a valid absolute URL");
    expect(() => createSsoServer({
      clientId,
      appUrl: "https://app.example.com",
      sessionSecret: undefined as unknown as string,
    })).toThrow("SSO sessionSecret is required");
  });
});

async function newFlow() {
  return createSsoAuthorization({
    clientId,
    redirectUri: "https://app.example.com/auth/callback",
    returnTo: "/dashboard",
    baseUrl: issuer,
  });
}

async function sign(claims: Record<string, unknown>, tokenAudience: string) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(tokenAudience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);
}

function requiredHeader(response: Response, name: string): string {
  const value = response.headers.get(name);
  if (!value) throw new Error(`Missing ${name} header`);
  return value;
}

function requiredParam(url: URL, name: string): string {
  const value = url.searchParams.get(name);
  if (!value) throw new Error(`Missing ${name} parameter`);
  return value;
}

function cookiePair(setCookie: string): string {
  return setCookie.split(";", 1)[0] ?? "";
}
