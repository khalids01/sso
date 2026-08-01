import {
  EncryptJWT,
  createLocalJWKSet,
  jwtDecrypt,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload,
} from "jose";
import {
  SSO_SCOPE,
  getSsoEndpoints,
  safeReturnTo,
  type SsoClientMetadata,
  type SsoSession,
  type SsoTokenResponse,
  type SsoUser,
} from "../index.js";

export {
  createSsoBetterAuthProvider,
  type BetterAuthTokenSet,
  type CreateSsoBetterAuthProviderOptions,
} from "../index.js";

export interface SsoAuthorizationFlow {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
}

export interface CreateSsoAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  baseUrl?: string;
  returnTo?: string | null;
}

export interface FinishSsoAuthorizationOptions {
  clientId: string;
  code: string;
  state: string;
  flow: SsoAuthorizationFlow;
  baseUrl?: string;
  maxFlowAgeSeconds?: number;
  fetch?: typeof fetch;
}

export interface VerifySsoIdTokenOptions {
  clientId: string;
  idToken: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  nonce?: string;
}

export interface VerifiedSsoIdentity {
  user: SsoUser;
  claims: JWTPayload;
  metadata: SsoClientMetadata;
}

export interface VerifiedSsoAuthorization {
  user: SsoUser;
  tokens: SsoTokenResponse;
  accessClaims: JWTPayload;
  identityClaims: JWTPayload;
  metadata: SsoClientMetadata;
  returnTo: string;
}

export interface SsoServerPaths {
  login: string;
  callback: string;
  profile: string;
  logout: string;
}

export interface SsoCookieOptions {
  flowName?: string;
  sessionName?: string;
  path?: string;
  domain?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
}

export interface SsoSignInContext {
  user: SsoUser;
  authorization: VerifiedSsoAuthorization;
  request: Request;
}

export interface CreateSsoServerOptions<TUser extends SsoUser = SsoUser> {
  clientId: string;
  appUrl: string;
  sessionSecret: string | Uint8Array;
  baseUrl?: string;
  redirectOrigin?: string;
  trustedOrigins?: string[];
  paths?: Partial<SsoServerPaths>;
  cookies?: SsoCookieOptions;
  flowTtlSeconds?: number;
  sessionTtlSeconds?: number;
  fetch?: typeof fetch;
  onSignIn?: (context: SsoSignInContext) => TUser | Promise<TUser>;
  onError?: (error: unknown, request: Request) => void;
}

export interface SsoServer<TUser extends SsoUser = SsoUser> {
  paths: SsoServerPaths;
  callbackUrl: string;
  login: (request: Request) => Promise<Response>;
  callback: (request: Request) => Promise<Response>;
  profile: (request: Request) => Promise<Response>;
  logout: (request: Request) => Promise<Response>;
  getSession: (request: Request) => Promise<SsoSession<TUser> | null>;
  handle: (request: Request) => Promise<Response>;
}

const DEFAULT_PATHS: SsoServerPaths = {
  login: "/auth/login",
  callback: "/auth/callback",
  profile: "/auth/profile",
  logout: "/auth/logout",
};

export async function createSsoAuthorization(
  options: CreateSsoAuthorizationOptions,
): Promise<{ url: URL; flow: SsoAuthorizationFlow }> {
  requireValue(options.clientId, "clientId");
  const redirectUri = new URL(options.redirectUri).toString();
  const verifier = randomBase64Url(48);
  const challenge = await sha256Base64Url(verifier);
  const flow: SsoAuthorizationFlow = {
    state: randomBase64Url(24),
    nonce: randomBase64Url(24),
    verifier,
    redirectUri,
    returnTo: safeReturnTo(options.returnTo),
    createdAt: Date.now(),
  };
  const url = new URL(getSsoEndpoints(options.baseUrl).authorization);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SSO_SCOPE,
    state: flow.state,
    nonce: flow.nonce,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString();
  return { url, flow };
}

export async function finishSsoAuthorization(
  options: FinishSsoAuthorizationOptions,
): Promise<VerifiedSsoAuthorization> {
  const maxAge = (options.maxFlowAgeSeconds ?? 600) * 1000;
  if (options.state !== options.flow.state) throw new Error("SSO state mismatch");
  if (Date.now() - options.flow.createdAt > maxAge) throw new Error("SSO flow expired");

  const request = getFetch(options.fetch);
  const endpoints = getSsoEndpoints(options.baseUrl);
  const [metadata, tokens, jwks] = await Promise.all([
    fetchSsoClientMetadata(options.clientId, options.baseUrl, request),
    exchangeAuthorizationCode(options, endpoints.token, request),
    fetchSsoJwks(endpoints.jwks, request),
  ]);
  const keySet = createLocalJWKSet(jwks);
  const [access, identity] = await Promise.all([
    jwtVerify(tokens.access_token, keySet, {
      issuer: metadata.issuer,
      audience: metadata.audience,
    }),
    jwtVerify(tokens.id_token, keySet, {
      issuer: metadata.issuer,
      audience: options.clientId,
    }),
  ]);
  if (access.payload.sub !== identity.payload.sub) throw new Error("SSO token subject mismatch");
  if (identity.payload.nonce !== options.flow.nonce) throw new Error("SSO nonce mismatch");

  return {
    user: claimsToSsoUser(identity.payload),
    tokens,
    accessClaims: access.payload,
    identityClaims: identity.payload,
    metadata,
    returnTo: options.flow.returnTo,
  };
}

export async function verifySsoIdToken(options: VerifySsoIdTokenOptions): Promise<VerifiedSsoIdentity> {
  const request = getFetch(options.fetch);
  const endpoints = getSsoEndpoints(options.baseUrl);
  const [metadata, jwks] = await Promise.all([
    fetchSsoClientMetadata(options.clientId, options.baseUrl, request),
    fetchSsoJwks(endpoints.jwks, request),
  ]);
  const { payload } = await jwtVerify(options.idToken, createLocalJWKSet(jwks), {
    issuer: metadata.issuer,
    audience: options.clientId,
  });
  if (options.nonce !== undefined && payload.nonce !== options.nonce) throw new Error("SSO nonce mismatch");
  return { user: claimsToSsoUser(payload), claims: payload, metadata };
}

export async function fetchSsoClientMetadata(
  clientId: string,
  baseUrl?: string,
  customFetch?: typeof fetch,
): Promise<SsoClientMetadata> {
  requireValue(clientId, "clientId");
  const request = getFetch(customFetch);
  const url = getSsoEndpoints(baseUrl).clientMetadata(clientId);
  const value = await getJson(url, request, "metadata");
  if (
    !isRecord(value) ||
    value.client_id !== clientId ||
    typeof value.application_id !== "string" ||
    typeof value.audience !== "string" ||
    typeof value.issuer !== "string"
  ) {
    throw new Error("Invalid SSO client metadata");
  }
  new URL(value.issuer);
  return value as unknown as SsoClientMetadata;
}

export function createSsoServer<TUser extends SsoUser = SsoUser>(
  options: CreateSsoServerOptions<TUser>,
): SsoServer<TUser> {
  requireValue(options.clientId, "clientId");
  const appOrigin = new URL(options.appUrl).origin;
  const redirectOrigin = new URL(options.redirectOrigin ?? appOrigin).origin;
  const paths = normalizePaths(options.paths);
  const callbackUrl = new URL(paths.callback, appOrigin).toString();
  const flowTtl = positiveInteger(options.flowTtlSeconds ?? 600, "flowTtlSeconds");
  const sessionTtl = positiveInteger(options.sessionTtlSeconds ?? 600, "sessionTtlSeconds");
  const cookieConfig = normalizeCookieOptions(options.cookies, appOrigin);
  const trustedOrigins = new Set([
    appOrigin,
    redirectOrigin,
    ...(options.trustedOrigins ?? []).map((origin) => new URL(origin).origin),
  ]);
  const key = createSessionKey(options.sessionSecret);

  async function login(request: Request): Promise<Response> {
    const returnTo = new URL(request.url).searchParams.get("returnTo");
    const authorization = await createSsoAuthorization({
      clientId: options.clientId,
      redirectUri: callbackUrl,
      returnTo,
      ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    });
    return redirectResponse(
      authorization.url,
      serializeCookie(cookieConfig.flowName, await seal(authorization.flow, flowTtl, key), flowTtl, cookieConfig),
    );
  }

  async function callback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.searchParams.has("error")) throw new Error("SSO authorization was denied");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("SSO callback is missing code or state");
      const flow = await unseal<SsoAuthorizationFlow>(readCookie(request, cookieConfig.flowName), key);
      const authorization = await finishSsoAuthorization({
        clientId: options.clientId,
        code,
        state,
        flow,
        maxFlowAgeSeconds: flowTtl,
        ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
        ...(options.fetch ? { fetch: options.fetch } : {}),
      });
      const user = options.onSignIn
        ? await options.onSignIn({ user: authorization.user, authorization, request })
        : authorization.user as TUser;
      const seconds = Math.min(authorization.tokens.expires_in, sessionTtl);
      const session: SsoSession<TUser> = { user, expiresAt: Date.now() + seconds * 1000 };
      return redirectResponse(
        new URL(authorization.returnTo, redirectOrigin),
        serializeCookie(cookieConfig.sessionName, await seal(session, seconds, key), seconds, cookieConfig),
        serializeCookie(cookieConfig.flowName, "", 0, cookieConfig),
      );
    } catch (error) {
      options.onError?.(error, request);
      return Response.json(
        { error: "invalid_sso_callback" },
        {
          status: 400,
          headers: {
            "cache-control": "no-store",
            "set-cookie": serializeCookie(cookieConfig.flowName, "", 0, cookieConfig),
          },
        },
      );
    }
  }

  async function getSession(request: Request): Promise<SsoSession<TUser> | null> {
    try {
      const session = await unseal<SsoSession<TUser>>(readCookie(request, cookieConfig.sessionName), key);
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  async function profile(request: Request): Promise<Response> {
    const session = await getSession(request);
    return session
      ? Response.json(session, { headers: { "cache-control": "no-store" } })
      : Response.json(
          { error: "unauthorized" },
          { status: 401, headers: { "cache-control": "no-store" } },
        );
  }

  async function logout(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    if (origin && !trustedOrigins.has(new URL(origin).origin)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        "cache-control": "no-store",
        "set-cookie": serializeCookie(cookieConfig.sessionName, "", 0, cookieConfig),
      },
    });
  }

  async function handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === paths.login && request.method === "GET") return login(request);
    if (pathname === paths.callback && request.method === "GET") return callback(request);
    if (pathname === paths.profile && request.method === "GET") return profile(request);
    if (pathname === paths.logout && request.method === "POST") return logout(request);
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return { paths, callbackUrl, login, callback, profile, logout, getSession, handle };
}

async function exchangeAuthorizationCode(
  options: FinishSsoAuthorizationOptions,
  tokenUrl: string,
  request: typeof fetch,
): Promise<SsoTokenResponse> {
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
  if (!response.ok) throw new Error(`SSO token exchange failed (${response.status})`);
  const value = await response.json();
  if (
    !isRecord(value) ||
    typeof value.access_token !== "string" ||
    typeof value.id_token !== "string" ||
    value.token_type !== "Bearer" ||
    !Number.isInteger(value.expires_in) ||
    Number(value.expires_in) <= 0 ||
    value.scope !== SSO_SCOPE
  ) {
    throw new Error("Invalid SSO token response");
  }
  return value as unknown as SsoTokenResponse;
}

async function fetchSsoJwks(url: string, request: typeof fetch): Promise<JSONWebKeySet> {
  const value = await getJson(url, request, "JWKS");
  if (!isRecord(value) || !Array.isArray(value.keys)) throw new Error("Invalid SSO JWKS response");
  return value as unknown as JSONWebKeySet;
}

function claimsToSsoUser(claims: JWTPayload): SsoUser {
  if (typeof claims.sub !== "string" || typeof claims.name !== "string" || typeof claims.email !== "string") {
    throw new Error("SSO identity token is missing required claims");
  }
  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    image: typeof claims.picture === "string" ? claims.picture : null,
  };
}

async function getJson(url: string, request: typeof fetch, label: string): Promise<unknown> {
  const response = await request(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`SSO ${label} request failed (${response.status})`);
  return response.json();
}

function normalizePaths(paths: Partial<SsoServerPaths> | undefined): SsoServerPaths {
  const result = { ...DEFAULT_PATHS, ...paths };
  for (const [name, path] of Object.entries(result)) {
    if (!path.startsWith("/")) throw new Error(`SSO ${name} path must start with /`);
  }
  return result;
}

type NormalizedCookieOptions = Required<Pick<SsoCookieOptions, "flowName" | "sessionName" | "path" | "sameSite" | "secure">> &
  Pick<SsoCookieOptions, "domain">;

function normalizeCookieOptions(options: SsoCookieOptions | undefined, appOrigin: string): NormalizedCookieOptions {
  const secure = options?.secure ?? appOrigin.startsWith("https:");
  const sameSite = options?.sameSite ?? "lax";
  if (sameSite === "none" && !secure) throw new Error("SSO SameSite=None cookies must be Secure");
  return {
    flowName: options?.flowName ?? "sso_flow",
    sessionName: options?.sessionName ?? "sso_session",
    path: options?.path ?? "/",
    sameSite,
    secure,
    ...(options?.domain ? { domain: options.domain } : {}),
  };
}

function serializeCookie(
  name: string,
  value: string,
  maxAge: number,
  options: NormalizedCookieOptions,
): string {
  return [
    `${name}=${value}`,
    `Path=${options.path}`,
    "HttpOnly",
    `SameSite=${capitalize(options.sameSite)}`,
    `Max-Age=${maxAge}`,
    options.secure ? "Secure" : undefined,
    options.domain ? `Domain=${options.domain}` : undefined,
  ].filter((part): part is string => Boolean(part)).join("; ");
}

function readCookie(request: Request, name: string): string {
  const value = request.headers.get("cookie")?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) throw new Error(`Missing ${name} cookie`);
  return value;
}

async function seal(value: object, seconds: number, key: Promise<Uint8Array>): Promise<string> {
  return new EncryptJWT({ ...value })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .encrypt(await key);
}

async function unseal<T>(token: string, key: Promise<Uint8Array>): Promise<T> {
  return (await jwtDecrypt(token, await key)).payload as T;
}

function createSessionKey(secret: string | Uint8Array): Promise<Uint8Array> {
  const bytes = typeof secret === "string" ? new TextEncoder().encode(secret) : new Uint8Array(secret);
  if (bytes.byteLength < 32) throw new Error("SSO sessionSecret must contain at least 32 bytes");
  return getCrypto().subtle.digest("SHA-256", bytes).then((value) => new Uint8Array(value));
}

function redirectResponse(url: URL, ...cookies: string[]): Response {
  const headers = new Headers({ location: url.toString(), "cache-control": "no-store" });
  cookies.forEach((cookie) => headers.append("set-cookie", cookie));
  return new Response(null, { status: 303, headers });
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await getCrypto().subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function getCrypto(): Crypto {
  if (!globalThis.crypto) throw new Error("SSO requires the Web Crypto API");
  return globalThis.crypto;
}

function getFetch(customFetch: typeof fetch | undefined): typeof fetch {
  const request = customFetch ?? globalThis.fetch;
  if (!request) throw new Error("SSO requires fetch in this environment");
  return request;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`SSO ${name} must be a positive integer`);
  return value;
}

function requireValue(value: string, name: string): void {
  if (!value.trim()) throw new Error(`SSO ${name} is required`);
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}
