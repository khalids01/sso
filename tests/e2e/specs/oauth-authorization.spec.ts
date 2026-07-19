import { createHash, randomBytes } from "node:crypto";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";
import { readRunState } from "../helpers/run-state";

declare global {
  interface Window {
    __oauthCallback?: { code: string | null; state: string | null; error: string | null };
  }
}

test("uses dedicated application auth and preserves the signed continuation", async ({ browser }) => {
  const fixture = readRunState().oauthFixture;
  if (!fixture) throw new Error("OAuth E2E fixture was not provisioned");

  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  try {
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorize = new URL("/api/auth/oauth2/authorize", e2eEnv.E2E_API_ORIGIN);
    authorize.search = new URLSearchParams({
      client_id: fixture.clientId,
      redirect_uri: fixture.redirectUri,
      response_type: "code",
      scope: "openid",
      state: randomBytes(24).toString("base64url"),
      nonce: randomBytes(24).toString("base64url"),
      code_challenge_method: "S256",
      code_challenge: challenge,
    }).toString();

    await page.goto(authorize.toString());
    await expect(page).toHaveURL(/\/application\/login\?/);
    await expect(
      page.getByRole("heading", { name: `Continue to E2E OAuth Client ${e2eEnv.runId}` }),
    ).toBeVisible();

    const loginQuery = new URL(page.url()).searchParams;
    expect(loginQuery.get("sig")).toBeTruthy();
    expect(loginQuery.get("exp")).toBeTruthy();
    await page.getByRole("link", { name: "Need an account? Sign Up" }).click();
    await expect(page).toHaveURL(/\/application\/signup\?/);
    expect([...new URL(page.url()).searchParams.entries()]).toEqual([...loginQuery.entries()]);

    await page.getByRole("link", { name: "Already have an account? Sign In" }).click();
    await expect(page).toHaveURL(/\/application\/login\?/);
    expect([...new URL(page.url()).searchParams.entries()]).toEqual([...loginQuery.entries()]);
  } finally {
    await context.close();
  }
});

test("exchange a Better Auth-produced single-use PKCE code", async ({ page }) => {
  const fixture = readRunState().oauthFixture;
  if (!fixture) throw new Error("OAuth E2E fixture was not provisioned");

  await test.step("resolve public verification metadata from the client ID", async () => {
    const response = await page.request.get(
      `${e2eEnv.E2E_API_ORIGIN}/api/oauth/client-metadata?client_id=${encodeURIComponent(fixture.clientId)}`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("max-age=300");
    expect(await response.json()).toEqual({
      client_id: fixture.clientId,
      application_id: fixture.applicationId,
      audience: `urn:sso:application:${fixture.applicationId}`,
      issuer: e2eEnv.SSO_ISSUER,
      sign_in_methods: ["magic_link", "password"],
      sign_up_methods: ["magic_link"],
      registration_mode: "open",
    });

    const missing = await page.request.get(
      `${e2eEnv.E2E_API_ORIGIN}/api/oauth/client-metadata?client_id=missing-client`,
    );
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({ error: "client_not_found" });
  });

  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const authorize = new URL("/api/auth/oauth2/authorize", e2eEnv.E2E_API_ORIGIN);
  authorize.search = new URLSearchParams({
    client_id: fixture.clientId,
    redirect_uri: fixture.redirectUri,
    response_type: "code",
    scope: "openid",
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();

  await test.step("complete the browser authorization redirect", async () => {
    await page.goto(authorize.toString());
    await expect(page).toHaveURL(`${e2eEnv.E2E_CALLBACK_ORIGIN}/callback`);
    await expect(page.getByRole("heading", { name: "Authorization callback received" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__oauthCallback?.state)).toBe(state);
    expect(await page.evaluate(() => window.__oauthCallback?.error)).toBeNull();
  });

  const callback = await page.evaluate(() => window.__oauthCallback);
  if (!callback?.code) throw new Error("Authorization callback did not contain a code");
  const code = callback.code;

  const tokenResult = await test.step("exchange the code from the registered callback origin", async () => {
    return page.evaluate(async (input) => {
      const response = await fetch(input.tokenUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: input.clientId,
          code: input.code,
          redirect_uri: input.redirectUri,
          code_verifier: input.verifier,
        }),
      });
      const body = await response.json();
      window.__oauthCallback = undefined;
      return { status: response.status, cacheControl: response.headers.get("cache-control"), body };
    }, {
      tokenUrl: `${e2eEnv.E2E_API_ORIGIN}/api/auth/oauth2/token`,
      clientId: fixture.clientId,
      code,
      redirectUri: fixture.redirectUri,
      verifier,
    });
  });

  expect(tokenResult.status).toBe(200);
  expect(tokenResult.cacheControl).toBe("no-store");
  expect(tokenResult.body.refresh_token).toBeUndefined();
  const accessToken = tokenResult.body.access_token as string;
  const idToken = tokenResult.body.id_token as string;

  await test.step("verify app-scoped claims against the public JWKS", async () => {
    const jwksResponse = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/api/auth/jwks`);
    expect(jwksResponse.ok()).toBeTruthy();
    expect(jwksResponse.headers()["cache-control"]).toContain("max-age=300");
    const jwks = await jwksResponse.json() as JSONWebKeySet;
    const keySet = createLocalJWKSet(jwks);
    const access = await jwtVerify(accessToken, keySet, {
      issuer: e2eEnv.SSO_ISSUER,
      audience: `urn:sso:application:${fixture.applicationId}`,
    });
    const identity = await jwtVerify(idToken, keySet, {
      issuer: e2eEnv.SSO_ISSUER,
      audience: fixture.clientId,
    });
    expect(access.payload).toMatchObject({
      azp: fixture.clientId,
      scope: "openid",
      application_id: fixture.applicationId,
      membership_id: fixture.memberId,
      authorization_version: 1,
    });
    expect(access.payload).not.toHaveProperty("permissions");
    expect(access.payload).not.toHaveProperty("roles");
    expect(identity.payload.sub).toBe(access.payload.sub);
    expect(identity.payload.nonce).toBe(nonce);
  });

  await test.step("reject reuse of the consumed code", async () => {
    const replay = await page.request.post(`${e2eEnv.E2E_API_ORIGIN}/api/auth/oauth2/token`, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      form: {
        grant_type: "authorization_code",
        client_id: fixture.clientId,
        code,
        redirect_uri: fixture.redirectUri,
        code_verifier: verifier,
      },
    });
    expect(replay.status()).toBe(400);
    expect(await replay.json()).toEqual({ error: "invalid_grant" });
  });
});
