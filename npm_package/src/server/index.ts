import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  FREE_SSO_DEFAULT_URL,
  FREE_SSO_PROVIDER_ID,
  FREE_SSO_SCOPE,
  getFreeSsoEndpoints,
  safeReturnTo,
  type FreeSsoClientMetadata,
  type FreeSsoTokenResponse,
  type FreeSsoUser,
} from "../index.js";

export interface FreeSsoAuthorizationFlow {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
}

export interface CreateAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  baseUrl?: string;
  returnTo?: string | null;
}

export interface FinishAuthorizationOptions {
  clientId: string;
  code: string;
  state: string;
  flow: FreeSsoAuthorizationFlow;
  baseUrl?: string;
  maxFlowAgeSeconds?: number;
  fetch?: typeof fetch;
}

export interface VerifiedAuthorization {
  user: FreeSsoUser;
  tokens: FreeSsoTokenResponse;
  accessClaims: JWTPayload;
  identityClaims: JWTPayload;
  metadata: FreeSsoClientMetadata;
  returnTo: string;
}

export interface BetterAuthTokenSet {
  idToken?: string | undefined;
}

export interface CreateBetterAuthProviderOptions {
  clientId: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export async function createFreeSsoAuthorization(
  options: CreateAuthorizationOptions,
): Promise<{ url: URL; flow: FreeSsoAuthorizationFlow }> {
  requireValue(options.clientId, "clientId");
  const redirectUri = new URL(options.redirectUri).toString();
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const flow: FreeSsoAuthorizationFlow = {
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    verifier,
    redirectUri,
    returnTo: safeReturnTo(options.returnTo),
    createdAt: Date.now(),
  };
  const url = new URL(getFreeSsoEndpoints(options.baseUrl).authorization);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: FREE_SSO_SCOPE,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();
  return { url, flow };
}

export async function finishFreeSsoAuthorization(
  options: FinishAuthorizationOptions,
): Promise<VerifiedAuthorization> {
  const maxAge = (options.maxFlowAgeSeconds ?? 600) * 1000;
  if (options.state !== options.flow.state) throw new Error("Free SSO state mismatch");
  if (Date.now() - options.flow.createdAt > maxAge) throw new Error("Free SSO flow expired");

  const request = options.fetch ?? globalThis.fetch;
  const endpoints = getFreeSsoEndpoints(options.baseUrl);
  const [metadata, tokens] = await Promise.all([
    fetchClientMetadata(options.clientId, endpoints.clientMetadata(options.clientId), request),
    exchangeAuthorizationCode(options, endpoints.token, request),
  ]);
  const jwks = createRemoteJWKSet(new URL(endpoints.jwks));
  const [access, identity] = await Promise.all([
    jwtVerify(tokens.access_token, jwks, {
      issuer: metadata.issuer,
      audience: metadata.audience,
    }),
    jwtVerify(tokens.id_token, jwks, {
      issuer: metadata.issuer,
      audience: options.clientId,
    }),
  ]);
  if (access.payload.sub !== identity.payload.sub) throw new Error("Free SSO token subject mismatch");
  if (identity.payload.nonce !== options.flow.nonce) throw new Error("Free SSO nonce mismatch");

  return {
    user: claimsToUser(identity.payload),
    tokens,
    accessClaims: access.payload,
    identityClaims: identity.payload,
    metadata,
    returnTo: options.flow.returnTo,
  };
}

export function createFreeSsoBetterAuthProvider(options: CreateBetterAuthProviderOptions) {
  requireValue(options.clientId, "clientId");
  const endpoints = getFreeSsoEndpoints(options.baseUrl ?? FREE_SSO_DEFAULT_URL);
  const request = options.fetch ?? globalThis.fetch;
  const jwks = createRemoteJWKSet(new URL(endpoints.jwks));

  return {
    providerId: FREE_SSO_PROVIDER_ID,
    clientId: options.clientId,
    authorizationUrl: endpoints.authorization,
    tokenUrl: endpoints.token,
    scopes: [FREE_SSO_SCOPE],
    pkce: true,
    getUserInfo: async (tokens: BetterAuthTokenSet) => {
      if (!tokens.idToken) return null;
      const metadata = await fetchClientMetadata(
        options.clientId,
        endpoints.clientMetadata(options.clientId),
        request,
      );
      const { payload } = await jwtVerify(tokens.idToken, jwks, {
        issuer: metadata.issuer,
        audience: options.clientId,
      });
      try {
        const user = claimsToUser(payload);
        return { ...user, image: user.image ?? undefined };
      } catch {
        return null;
      }
    },
  };
}

async function exchangeAuthorizationCode(
  options: FinishAuthorizationOptions,
  tokenUrl: string,
  request: typeof fetch,
): Promise<FreeSsoTokenResponse> {
  const response = await request(tokenUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: options.clientId,
      redirect_uri: options.flow.redirectUri,
      code: options.code,
      code_verifier: options.flow.verifier,
    }),
  });
  if (!response.ok) throw new Error(`Free SSO token exchange failed (${response.status})`);
  return parseTokenResponse(await response.json());
}

async function fetchClientMetadata(
  clientId: string,
  url: string,
  request: typeof fetch,
): Promise<FreeSsoClientMetadata> {
  const response = await request(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Free SSO metadata request failed (${response.status})`);
  const value = await response.json();
  if (!isRecord(value) || value.client_id !== clientId || typeof value.application_id !== "string" ||
      typeof value.audience !== "string" || typeof value.issuer !== "string") {
    throw new Error("Invalid Free SSO client metadata");
  }
  new URL(value.issuer);
  return value as unknown as FreeSsoClientMetadata;
}

function parseTokenResponse(value: unknown): FreeSsoTokenResponse {
  if (!isRecord(value) || typeof value.access_token !== "string" || typeof value.id_token !== "string" ||
      value.token_type !== "Bearer" || !Number.isInteger(value.expires_in) || Number(value.expires_in) <= 0 ||
      value.scope !== FREE_SSO_SCOPE) {
    throw new Error("Invalid Free SSO token response");
  }
  return value as unknown as FreeSsoTokenResponse;
}

function claimsToUser(claims: JWTPayload): FreeSsoUser {
  if (typeof claims.sub !== "string" || typeof claims.name !== "string" || typeof claims.email !== "string") {
    throw new Error("Free SSO identity token is missing required claims");
  }
  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    image: typeof claims.picture === "string" ? claims.picture : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireValue(value: string, name: string): void {
  if (!value.trim()) throw new Error(`Free SSO ${name} is required`);
}
