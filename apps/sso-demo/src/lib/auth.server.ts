import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

const CONTEXT_COOKIE = "sso_demo_oauth";
const SESSION_COOKIE = "sso_demo_session";
const OAUTH_TTL_SECONDS = 10 * 60;

const metadataSchema = z.object({
  client_id: z.string().min(1),
  application_id: z.string().min(1),
  audience: z.string().min(1),
  issuer: z.string().url(),
});

const tokenSchema = z.object({
  access_token: z.string().min(1),
  id_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  scope: z.literal("openid"),
});

const oauthContextSchema = z.object({
  clientId: z.string().min(1),
  state: z.string().min(1),
  nonce: z.string().min(1),
  verifier: z.string().min(43),
  redirectUri: z.string().url(),
  createdAt: z.number().int(),
});

const sessionSchema = z.object({
  subject: z.string().min(1),
  clientId: z.string().min(1),
  applicationId: z.string().min(1),
  membershipId: z.string().min(1),
  audience: z.string().min(1),
  issuer: z.string().url(),
  scope: z.literal("openid"),
  authorizationVersion: z.number().int().positive(),
  issuedAt: z.number().int(),
  expiresAt: z.number().int(),
});

export type DemoSession = z.infer<typeof sessionSchema>;

function getConfig() {
  const origin = process.env.SSO_DEMO_ORIGIN ?? "http://localhost:5003";
  const apiOrigin = process.env.SSO_API_ORIGIN ?? "http://localhost:5001";
  const secret = process.env.SSO_DEMO_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SSO_DEMO_SESSION_SECRET must contain at least 32 characters");
  }
  return { origin: new URL(origin).origin, apiOrigin: new URL(apiOrigin).origin, secret };
}

function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

function encryptionKey(secret: string): Uint8Array<ArrayBuffer> {
  const key = new Uint8Array(32);
  key.set(createHash("sha256").update(`sso-demo:${secret}`).digest());
  return key;
}

async function seal(value: unknown, secret: string): Promise<string> {
  const iv = new Uint8Array(12);
  iv.set(randomBytes(12));
  const key = await crypto.subtle.importKey("raw", encryptionKey(secret), "AES-GCM", false, ["encrypt"]);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return `${Buffer.from(iv).toString("base64url")}.${Buffer.from(encrypted).toString("base64url")}`;
}

async function unseal(value: string, secret: string): Promise<unknown> {
  const [ivValue, encryptedValue] = value.split(".");
  if (!ivValue || !encryptedValue) throw new Error("Invalid sealed value");
  const key = await crypto.subtle.importKey("raw", encryptionKey(secret), "AES-GCM", false, ["decrypt"]);
  const iv = new Uint8Array(12);
  iv.set(Buffer.from(ivValue, "base64url"));
  const encrypted = Uint8Array.from(Buffer.from(encryptedValue, "base64url"));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
}

function setCookie(name: string, value: string, maxAge: number, secure: boolean): string {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : undefined,
  ].filter(Boolean).join("; ");
}

function clearCookie(name: string, secure: boolean): string {
  return setCookie(name, "", 0, secure);
}

function safeErrorRedirect(origin: string, error: string): Response {
  const url = new URL("/", origin);
  url.searchParams.set("error", error);
  return Response.redirect(url, 303);
}

export async function startAuthorization(request: Request): Promise<Response> {
  const config = getConfig();
  const requestUrl = new URL(request.url);
  const clientId = requestUrl.searchParams.get("client_id") ?? process.env.SSO_DEMO_CLIENT_ID;
  if (!clientId) return safeErrorRedirect(config.origin, "client_not_configured");

  const redirectUri = `${config.origin}/auth/callback`;
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const context = {
    clientId,
    verifier,
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    redirectUri,
    createdAt: Date.now(),
  };
  const authorizeUrl = new URL("/api/auth/oauth2/authorize", config.apiOrigin);
  authorizeUrl.search = new URLSearchParams({
    client_id: context.clientId,
    redirect_uri: context.redirectUri,
    response_type: "code",
    scope: "openid",
    state: context.state,
    nonce: context.nonce,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();

  const headers = new Headers({ location: authorizeUrl.toString(), "cache-control": "no-store" });
  headers.append("set-cookie", setCookie(CONTEXT_COOKIE, await seal(context, config.secret), OAUTH_TTL_SECONDS, config.origin.startsWith("https:")));
  return new Response(null, { status: 303, headers });
}

export async function finishAuthorization(request: Request): Promise<Response> {
  const config = getConfig();
  const secure = config.origin.startsWith("https:");
  const requestUrl = new URL(request.url);
  const sealedContext = cookieValue(request.headers.get("cookie"), CONTEXT_COOKIE);
  if (!sealedContext) return safeErrorRedirect(config.origin, "missing_authorization_context");

  let context: z.infer<typeof oauthContextSchema>;
  try {
    context = oauthContextSchema.parse(await unseal(sealedContext, config.secret));
  } catch {
    return safeErrorRedirect(config.origin, "invalid_authorization_context");
  }
  if (Date.now() - context.createdAt > OAUTH_TTL_SECONDS * 1000) {
    return safeErrorRedirect(config.origin, "authorization_context_expired");
  }
  if (requestUrl.searchParams.get("state") !== context.state) {
    return safeErrorRedirect(config.origin, "state_mismatch");
  }
  if (requestUrl.searchParams.has("error")) {
    return safeErrorRedirect(config.origin, "authorization_denied");
  }
  const code = requestUrl.searchParams.get("code");
  if (!code) return safeErrorRedirect(config.origin, "missing_authorization_code");

  try {
    const metadataResponse = await fetch(`${config.apiOrigin}/api/oauth/client-metadata?client_id=${encodeURIComponent(context.clientId)}`, { headers: { accept: "application/json" } });
    if (!metadataResponse.ok) throw new Error("Client metadata unavailable");
    const metadata = metadataSchema.parse(await metadataResponse.json());
    if (metadata.client_id !== context.clientId) throw new Error("Client metadata mismatch");

    const tokenResponse = await fetch(`${config.apiOrigin}/api/auth/oauth2/token`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        origin: config.origin,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: context.clientId,
        code,
        redirect_uri: context.redirectUri,
        code_verifier: context.verifier,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Authorization code exchange failed");
    const tokens = tokenSchema.parse(await tokenResponse.json());
    const jwks = createRemoteJWKSet(new URL("/api/auth/jwks", config.apiOrigin));
    const [access, identity] = await Promise.all([
      jwtVerify(tokens.access_token, jwks, { issuer: metadata.issuer, audience: metadata.audience }),
      jwtVerify(tokens.id_token, jwks, { issuer: metadata.issuer, audience: context.clientId }),
    ]);
    if (identity.payload.sub !== access.payload.sub || identity.payload.nonce !== context.nonce) {
      throw new Error("Identity token binding failed");
    }
    const session = sessionSchema.parse({
      subject: access.payload.sub,
      clientId: access.payload.azp,
      applicationId: access.payload.application_id,
      membershipId: access.payload.membership_id,
      audience: metadata.audience,
      issuer: metadata.issuer,
      scope: access.payload.scope,
      authorizationVersion: access.payload.authorization_version,
      issuedAt: access.payload.iat,
      expiresAt: access.payload.exp,
    });
    const headers = new Headers({ location: "/dashboard?connected=true", "cache-control": "no-store" });
    headers.append("set-cookie", clearCookie(CONTEXT_COOKIE, secure));
    headers.append("set-cookie", setCookie(SESSION_COOKIE, await seal(session, config.secret), Math.min(tokens.expires_in, OAUTH_TTL_SECONDS), secure));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    console.error("[sso-demo] OAuth callback failed", error instanceof Error ? error.message : "unknown error");
    return safeErrorRedirect(config.origin, "callback_failed");
  }
}

export function endSession(request: Request): Response {
  const config = getConfig();
  const origin = request.headers.get("origin");
  if (origin && origin !== config.origin) return new Response("Forbidden", { status: 403 });
  const headers = new Headers({ location: "/", "cache-control": "no-store" });
  headers.append("set-cookie", clearCookie(SESSION_COOKIE, config.origin.startsWith("https:")));
  headers.append("set-cookie", clearCookie(CONTEXT_COOKIE, config.origin.startsWith("https:")));
  return new Response(null, { status: 303, headers });
}

export async function readSession(cookieHeader: string | null): Promise<DemoSession | null> {
  const config = getConfig();
  const value = cookieValue(cookieHeader, SESSION_COOKIE);
  if (!value) return null;
  try {
    const session = sessionSchema.parse(await unseal(value, config.secret));
    return session.expiresAt > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}
