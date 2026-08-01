import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  createFreeSsoAuthorization,
  finishFreeSsoAuthorization,
  type FreeSsoAuthorizationFlow,
} from "../src/server/index.js";

const clientId = "client_test";
const audience = "app_test";
const subject = "user_test";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig", kid: "test-key" };
let expectedNonce = "";
let identityNonce = "";
let tokenRequestBody = "";
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
  test("exchanges and verifies a valid authorization response", async () => {
    const { flow } = await newFlow();
    expectedNonce = flow.nonce;
    identityNonce = expectedNonce;

    const result = await finishFreeSsoAuthorization({
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
    await expect(finishFreeSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: "wrong_state",
      flow,
      baseUrl: issuer,
    })).rejects.toThrow("state mismatch");
  });

  test("rejects an expired authorization flow", async () => {
    const { flow } = await newFlow();
    const expiredFlow: FreeSsoAuthorizationFlow = { ...flow, createdAt: Date.now() - 601_000 };
    await expect(finishFreeSsoAuthorization({
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
    await expect(finishFreeSsoAuthorization({
      clientId,
      code: "authorization_code",
      state: flow.state,
      flow,
      baseUrl: issuer,
    })).rejects.toThrow("nonce mismatch");
  });
});

async function newFlow() {
  return createFreeSsoAuthorization({
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
