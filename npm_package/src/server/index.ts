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
  type SsoAuthMethod,
  type SsoSession,
  type SsoTokenResponse,
  type SsoUser,
} from "../index.js";

export {
  createSsoBetterAuthIntegration,
  type SsoBetterAuthIntegrationOptions,
  type SsoBetterAuthBootstrap,
  type SsoBetterAuthIntegration,
  type SsoPublicConfig,
} from "../index.js";

export interface SsoAuthorizationFlow {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
  popup?: boolean;
}

export interface CreateSsoAuthorizationOptions {
  clientId: string;
  redirectUri: string;
  baseUrl?: string;
  returnTo?: string | null;
  forceLogin?: boolean;
  intent?: "signin" | "signup";
  provider?: Extract<SsoAuthMethod, "google" | "facebook" | "linkedin" | "github">;
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
  publishableKey?: string;
  clientId?: string;
  idToken: string;
  ssoUrl?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  nonce?: string;
}

export interface VerifySsoAccessTokenOptions {
  publishableKey?: string;
  clientId?: string;
  accessToken: string;
  ssoUrl?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface VerifiedSsoAccessToken {
  subject: string;
  claims: JWTPayload;
  metadata: SsoClientMetadata;
}

export interface SsoAccessTokenVerifier {
  verify: (accessToken: string) => Promise<VerifiedSsoAccessToken>;
  clearCache: () => void;
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
  config: string;
  passwordLogin: string;
  passwordSignup: string;
  magicLink: string;
  profile: string;
  userProfile: string;
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

interface SsoServerAdvancedOptions<TUser extends SsoUser> {
  /** Usually inferred from each request. Set only when host inference is unavailable. */
  appUrl?: string;
  redirectOrigin?: string;
  trustedOrigins?: string[];
  paths?: Partial<SsoServerPaths>;
  cookies?: SsoCookieOptions;
  flowTtlSeconds?: number;
  sessionTtlSeconds?: number;
  fetch?: typeof fetch;
  interactionMode?: "hosted" | "embedded";
  oauthMode?: "redirect" | "popup";
  onSignIn?: (context: SsoSignInContext) => TUser | Promise<TUser>;
  onError?: (error: unknown, request: Request) => void;
}

export type CreateSsoServerOptions<TUser extends SsoUser = SsoUser> =
  SsoServerAdvancedOptions<TUser> & (
    | {
        publishableKey: string;
        secretKey: string | Uint8Array;
        ssoUrl: string;
        clientId?: string;
        sessionSecret?: string | Uint8Array;
        baseUrl?: string;
      }
    | {
        clientId: string;
        sessionSecret: string | Uint8Array;
        baseUrl: string;
        publishableKey?: string;
        secretKey?: string | Uint8Array;
        ssoUrl?: string;
      }
  );

export interface SsoServer<TUser extends SsoUser = SsoUser> {
  paths: SsoServerPaths;
  callbackUrl: string;
  login: (request: Request) => Promise<Response>;
  callback: (request: Request) => Promise<Response>;
  config: () => Promise<Response>;
  passwordLogin: (request: Request) => Promise<Response>;
  passwordSignup: (request: Request) => Promise<Response>;
  magicLink: (request: Request) => Promise<Response>;
  profile: (request: Request) => Promise<Response>;
  userProfile: (request: Request) => Promise<Response>;
  logout: (request: Request) => Promise<Response>;
  getSession: (request: SsoSessionRequest) => Promise<SsoSession<TUser> | null>;
  getBootstrap: (request: SsoSessionRequest) => Promise<StandaloneSsoBootstrap<TUser>>;
  handle: (request: Request) => Promise<Response>;
}

export type SsoSessionRequest = Request | Headers;

export interface StandaloneSsoClientConfig {
  baseUrl: string;
  loginPath: string;
  configPath?: string;
  passwordLoginPath?: string;
  passwordSignupPath?: string;
  magicLinkPath?: string;
  profilePath: string;
  userProfilePath?: string;
  logoutPath: string;
  interactionMode?: "hosted" | "embedded";
  oauthMode?: "redirect" | "popup";
}

export interface StandaloneSsoBootstrap<TUser extends SsoUser = SsoUser> {
  kind: "standalone";
  session: SsoSession<TUser> | null;
  client: StandaloneSsoClientConfig;
}

const DEFAULT_PATHS: SsoServerPaths = {
  login: "/auth/login",
  callback: "/auth/callback",
  config: "/auth/config",
  passwordLogin: "/auth/password/login",
  passwordSignup: "/auth/password/signup",
  magicLink: "/auth/magic-link",
  profile: "/auth/profile",
  userProfile: "/auth/user-profile",
  logout: "/auth/logout",
};

const pendingCallbacks = new Map<string, Promise<Response>>();

type StoredSsoSession<TUser extends SsoUser> = SsoSession<TUser> & {
  accessToken?: string;
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
    ...(options.forceLogin ? { prompt: "login" } : options.intent === "signup" ? { prompt: "create" } : {}),
    ...(options.provider ? { provider: options.provider } : {}),
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
  const { clientId, baseUrl } = normalizePublicConnectionOptions(options);
  const request = getFetch(options.fetch);
  const endpoints = getSsoEndpoints(baseUrl);
  const [metadata, jwks] = await Promise.all([
    fetchSsoClientMetadata(clientId, baseUrl, request),
    fetchSsoJwks(endpoints.jwks, request),
  ]);
  const { payload } = await jwtVerify(options.idToken, createLocalJWKSet(jwks), {
    issuer: metadata.issuer,
    audience: clientId,
  });
  if (options.nonce !== undefined && payload.nonce !== options.nonce) throw new Error("SSO nonce mismatch");
  return { user: claimsToSsoUser(payload), claims: payload, metadata };
}

/** Verify a token returned by `useAuth().getToken()` in an application's API. */
export async function verifySsoAccessToken(
  options: VerifySsoAccessTokenOptions,
): Promise<VerifiedSsoAccessToken> {
  const { clientId, baseUrl } = normalizePublicConnectionOptions(options);
  const request = getFetch(options.fetch);
  const endpoints = getSsoEndpoints(baseUrl);
  const [metadata, jwks] = await Promise.all([
    fetchSsoClientMetadata(clientId, baseUrl, request),
    fetchSsoJwks(endpoints.jwks, request),
  ]);
  const { payload } = await jwtVerify(
    options.accessToken,
    createLocalJWKSet(jwks),
    { issuer: metadata.issuer, audience: metadata.audience },
  );
  if (!payload.sub) throw new Error("SSO access token is missing a subject");
  return { subject: payload.sub, claims: payload, metadata };
}

/**
 * Create one verifier per API process. Public metadata and JWKS are reused for
 * five minutes so normal protected requests do not call the SSO service.
 */
export function createSsoAccessTokenVerifier(
  options: Omit<VerifySsoAccessTokenOptions, "accessToken"> & {
    cacheTtlSeconds?: number;
  },
): SsoAccessTokenVerifier {
  const { clientId, baseUrl } = normalizePublicConnectionOptions(options);
  const cacheTtl = positiveInteger(options.cacheTtlSeconds ?? 300, "cacheTtlSeconds") * 1_000;
  let cached: Promise<{
    metadata: SsoClientMetadata;
    keySet: ReturnType<typeof createLocalJWKSet>;
  }> | null = null;
  let cachedAt = 0;

  const load = () => {
    if (cached && Date.now() - cachedAt < cacheTtl) return cached;
    cachedAt = Date.now();
    const request = getFetch(options.fetch);
    const endpoints = getSsoEndpoints(baseUrl);
    cached = Promise.all([
      fetchSsoClientMetadata(clientId, baseUrl, request),
      fetchSsoJwks(endpoints.jwks, request),
    ]).then(([metadata, jwks]) => ({
      metadata,
      keySet: createLocalJWKSet(jwks),
    })).catch((error) => {
      cached = null;
      throw error;
    });
    return cached;
  };

  return {
    async verify(accessToken) {
      const { metadata, keySet } = await load();
      const { payload } = await jwtVerify(accessToken, keySet, {
        issuer: metadata.issuer,
        audience: metadata.audience,
      });
      if (!payload.sub) throw new Error("SSO access token is missing a subject");
      return { subject: payload.sub, claims: payload, metadata };
    },
    clearCache() {
      cached = null;
      cachedAt = 0;
    },
  };
}

function normalizePublicConnectionOptions(options: {
  publishableKey?: string;
  clientId?: string;
  ssoUrl?: string;
  baseUrl?: string;
}) {
  const clientId = options.publishableKey ?? options.clientId;
  const ssoUrl = options.ssoUrl ?? options.baseUrl;
  requireValue(clientId, "publishableKey");
  return {
    clientId,
    baseUrl: requireOrigin(ssoUrl, "ssoUrl"),
  };
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
  const clientId = options.publishableKey ?? options.clientId;
  const sessionSecret = options.secretKey ?? options.sessionSecret;
  const configuredSsoUrl = options.ssoUrl ?? options.baseUrl;
  requireValue(clientId, "publishableKey");
  requireValue(configuredSsoUrl, "ssoUrl");
  if (!sessionSecret) throw new Error("SSO secretKey is required");
  const normalizedClientId = clientId;
  const normalizedSsoUrl = configuredSsoUrl;
  if (!options.appUrl) {
    return createRequestAwareSsoServer({
      ...options,
      clientId: normalizedClientId,
      sessionSecret,
      baseUrl: normalizedSsoUrl,
    });
  }
  const appOrigin = requireOrigin(options.appUrl, "appUrl");
  const baseUrl = requireOrigin(normalizedSsoUrl, "ssoUrl");
  const redirectOrigin = requireOrigin(options.redirectOrigin ?? appOrigin, "redirectOrigin");
  const paths = normalizePaths(options.paths);
  const callbackUrl = new URL(paths.callback, appOrigin).toString();
  const flowTtl = positiveInteger(options.flowTtlSeconds ?? 600, "flowTtlSeconds");
  const sessionTtl = positiveInteger(options.sessionTtlSeconds ?? 600, "sessionTtlSeconds");
  const cookieConfig = normalizeCookieOptions(options.cookies, appOrigin, normalizedClientId);
  const trustedOrigins = new Set([
    appOrigin,
    redirectOrigin,
    ...(options.trustedOrigins ?? []).map((origin) => new URL(origin).origin),
  ]);
  const key = createSessionKey(sessionSecret);
  const clientConfig: StandaloneSsoClientConfig = {
    baseUrl: appOrigin,
    loginPath: paths.login,
    configPath: paths.config,
    passwordLoginPath: paths.passwordLogin,
    passwordSignupPath: paths.passwordSignup,
    magicLinkPath: paths.magicLink,
    profilePath: paths.profile,
    userProfilePath: paths.userProfile,
    logoutPath: paths.logout,
    interactionMode: options.interactionMode ?? "embedded",
    oauthMode: options.oauthMode ?? "popup",
  };

  async function login(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const returnTo = requestUrl.searchParams.get("returnTo");
    const forceLogin = requestUrl.searchParams.get("forceLogin") === "true";
    const popup = requestUrl.searchParams.get("popup") === "true";
    const provider = parseSocialProvider(requestUrl.searchParams.get("provider"));
    const intent = requestUrl.searchParams.get("intent") === "signup" ? "signup" : "signin";
    const authorization = await createSsoAuthorization({
      clientId: normalizedClientId,
      redirectUri: callbackUrl,
      returnTo,
      forceLogin,
      intent,
      ...(provider ? { provider } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    });
    authorization.flow.popup = popup;
    return redirectResponse(
      authorization.url,
      serializeCookie(cookieConfig.flowName, await seal(authorization.flow, flowTtl, key), flowTtl, cookieConfig),
    );
  }

  async function callback(request: Request): Promise<Response> {
    let callbackFlow: SsoAuthorizationFlow | null = null;
    try {
      const url = new URL(request.url);
      const state = url.searchParams.get("state");
      const flow = await unseal<SsoAuthorizationFlow>(readCookie(request, cookieConfig.flowName), key);
      callbackFlow = flow;
      if (!state || flow.state !== state) throw new Error("SSO state mismatch");
      if (url.searchParams.has("error")) throw new Error("SSO authorization was denied");
      const code = url.searchParams.get("code");
      if (!code) throw new Error("SSO callback is missing code");

      const callbackKey = `${normalizedClientId}:${state}`;
      const existing = pendingCallbacks.get(callbackKey);
      if (existing) return (await existing).clone();

      const pending = (async () => {
        const authorization = await finishSsoAuthorization({
          clientId: normalizedClientId,
          code,
          state,
          flow,
          maxFlowAgeSeconds: flowTtl,
          ...(baseUrl ? { baseUrl } : {}),
          ...(options.fetch ? { fetch: options.fetch } : {}),
        });
        const user = options.onSignIn
          ? await options.onSignIn({ user: authorization.user, authorization, request })
          : authorization.user as TUser;
        const seconds = Math.min(authorization.tokens.expires_in, sessionTtl);
        const session: StoredSsoSession<TUser> = {
          user,
          expiresAt: Date.now() + seconds * 1000,
          accessToken: authorization.tokens.access_token,
        };
        const sessionCookie = serializeCookie(
          cookieConfig.sessionName,
          await seal(session, seconds, key),
          seconds,
          cookieConfig,
        );
        const flowCookie = serializeCookie(cookieConfig.flowName, "", 0, cookieConfig);
        return flow.popup
          ? popupCompletionResponse({
              returnTo: authorization.returnTo,
              openerOrigin: redirectOrigin,
              cookies: [sessionCookie, flowCookie],
            })
          : redirectResponse(
              new URL(authorization.returnTo, redirectOrigin),
              sessionCookie,
              flowCookie,
            );
      })();
      pendingCallbacks.set(callbackKey, pending);
      try {
        const response = await pending;
        const cleanup = setTimeout(() => {
          if (pendingCallbacks.get(callbackKey) === pending) {
            pendingCallbacks.delete(callbackKey);
          }
        }, 10_000);
        if (typeof cleanup === "object" && "unref" in cleanup) cleanup.unref();
        return response.clone();
      } catch (error) {
        if (pendingCallbacks.get(callbackKey) === pending) {
          pendingCallbacks.delete(callbackKey);
        }
        throw error;
      }
    } catch (error) {
      options.onError?.(error, request);
      if (callbackFlow?.popup) {
        return popupCompletionResponse({
          returnTo: callbackFlow.returnTo,
          openerOrigin: redirectOrigin,
          error: "authentication_failed",
          message: error instanceof Error ? error.message : "SSO authentication failed",
          cookies: [serializeCookie(cookieConfig.flowName, "", 0, cookieConfig)],
        });
      }
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

  async function getStoredSession(request: SsoSessionRequest): Promise<StoredSsoSession<TUser> | null> {
    try {
      const session = await unseal<StoredSsoSession<TUser>>(readCookie(request, cookieConfig.sessionName), key);
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  async function getSession(request: SsoSessionRequest): Promise<SsoSession<TUser> | null> {
    const session = await getStoredSession(request);
    return session ? { user: session.user, expiresAt: session.expiresAt } : null;
  }

  async function getBootstrap(request: SsoSessionRequest): Promise<StandaloneSsoBootstrap<TUser>> {
    return {
      kind: "standalone",
      session: await getSession(request),
      client: { ...clientConfig },
    };
  }

  async function config(): Promise<Response> {
    try {
      const metadata = await fetchSsoClientMetadata(
        normalizedClientId,
        baseUrl,
        options.fetch,
      );
      return Response.json(
        { client: { ...clientConfig }, metadata },
        { headers: { "cache-control": "private, max-age=60" } },
      );
    } catch {
      return Response.json({ error: "sso_configuration_unavailable" }, { status: 503 });
    }
  }

  async function embeddedPassword(request: Request, intent: "login" | "signup") {
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name : "";
    const returnTo = typeof body.returnTo === "string" ? body.returnTo : "/";
    if (!email || !password || (intent === "signup" && !name)) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const authorization = await createSsoAuthorization({
      clientId: normalizedClientId,
      redirectUri: callbackUrl,
      returnTo,
      ...(baseUrl ? { baseUrl } : {}),
    });
    const target = new URL(
      `/auth/sdk/password/${intent}`,
      baseUrl ?? getSsoEndpoints().authorization,
    );
    const response = await getFetch(options.fetch)(target, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        clientId: normalizedClientId,
        redirectUri: callbackUrl,
        origin: redirectOrigin,
        state: authorization.flow.state,
        nonce: authorization.flow.nonce,
        codeChallenge: authorization.url.searchParams.get("code_challenge"),
        email,
        password,
        ...(intent === "signup" ? { name } : {}),
      }),
    });
    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return Response.json(
        {
          error: typeof result?.error === "string" ? result.error : "authentication_failed",
          message: typeof result?.message === "string" ? result.message : "Authentication failed",
        },
        { status: response.status },
      );
    }
    return Response.json(result, {
      headers: {
        "cache-control": "no-store",
        "set-cookie": serializeCookie(
          cookieConfig.flowName,
          await seal(authorization.flow, flowTtl, key),
          flowTtl,
          cookieConfig,
        ),
      },
    });
  }

  const passwordLogin = (request: Request) => embeddedPassword(request, "login");
  const passwordSignup = (request: Request) => embeddedPassword(request, "signup");

  async function magicLink(request: Request) {
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email : "";
    const name = typeof body.name === "string" ? body.name : "";
    const intent = body.intent === "signup" ? "signup" : "signin";
    const returnTo = typeof body.returnTo === "string" ? body.returnTo : "/";
    if (!email || (intent === "signup" && !name)) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }
    const authorization = await createSsoAuthorization({
      clientId: normalizedClientId,
      redirectUri: callbackUrl,
      returnTo,
      ...(baseUrl ? { baseUrl } : {}),
    });
    const target = new URL("/auth/sdk/magic-link", baseUrl ?? getSsoEndpoints().authorization);
    const response = await getFetch(options.fetch)(target, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        clientId: normalizedClientId,
        redirectUri: callbackUrl,
        origin: redirectOrigin,
        state: authorization.flow.state,
        nonce: authorization.flow.nonce,
        codeChallenge: authorization.url.searchParams.get("code_challenge"),
        intent,
        email,
        ...(name ? { name } : {}),
      }),
    });
    const result = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      return Response.json(
        {
          error: typeof result?.error === "string" ? result.error : "authentication_failed",
          message: typeof result?.message === "string" ? result.message : "Could not send magic link",
        },
        { status: response.status },
      );
    }
    return Response.json({ success: true }, {
      headers: {
        "cache-control": "no-store",
        "set-cookie": serializeCookie(
          cookieConfig.flowName,
          await seal(authorization.flow, flowTtl, key),
          flowTtl,
          cookieConfig,
        ),
      },
    });
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

  async function userProfile(request: Request): Promise<Response> {
    const session = await getStoredSession(request);
    if (!session?.accessToken) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    const upstream = await (options.fetch ?? fetch)(
      new URL("/auth/sdk/profile", baseUrl),
      {
        method: request.method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${session.accessToken}`,
          origin: redirectOrigin,
          ...(request.method === "POST" ? { "content-type": "application/json" } : {}),
        },
        ...(request.method === "POST" ? { body: await request.text() } : {}),
      },
    );
    const updated = upstream.ok && request.method === "POST"
      ? await upstream.clone().json().catch(() => null) as { user?: TUser } | null
      : null;
    const response = new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "cache-control": "private, no-store",
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
    if (updated?.user) {
        const seconds = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1_000));
        response.headers.append(
          "set-cookie",
          serializeCookie(
            cookieConfig.sessionName,
            await seal({ ...session, user: updated.user }, seconds, key),
            seconds,
            cookieConfig,
          ),
        );
    }
    return response;
  }

  async function logout(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin && !isTrustedOrigin(origin)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const global = requestUrl.searchParams.get("global") === "true";
    const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));
    const globalLogoutUrl = new URL(getSsoEndpoints(baseUrl).globalLogout);
    globalLogoutUrl.searchParams.set("client_id", normalizedClientId);
    globalLogoutUrl.searchParams.set(
      "return_to",
      new URL(returnTo, redirectOrigin).toString(),
    );
    return new Response(null, {
      status: global ? 303 : 204,
      headers: {
        "cache-control": "no-store",
        "set-cookie": serializeCookie(cookieConfig.sessionName, "", 0, cookieConfig),
        ...(global ? { location: globalLogoutUrl.toString() } : {}),
      },
    });
  }

  async function handle(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const isSsoPath = Object.values(paths).includes(pathname);
    if (request.method === "OPTIONS" && isSsoPath) {
      return withCors(request, new Response(null, { status: 204 }));
    }
    let response: Response | null = null;
    if (pathname === paths.login && request.method === "GET") response = await login(request);
    else if (pathname === paths.callback && request.method === "GET") response = await callback(request);
    else if (pathname === paths.config && request.method === "GET") response = await config();
    else if (pathname === paths.passwordLogin && request.method === "POST") response = await passwordLogin(request);
    else if (pathname === paths.passwordSignup && request.method === "POST") response = await passwordSignup(request);
    else if (pathname === paths.magicLink && request.method === "POST") response = await magicLink(request);
    else if (pathname === paths.profile && request.method === "GET") response = await profile(request);
    else if (pathname === paths.userProfile && ["GET", "POST"].includes(request.method)) response = await userProfile(request);
    else if (pathname === paths.logout && request.method === "POST") response = await logout(request);
    else if (
      pathname === paths.logout &&
      request.method === "GET" &&
      new URL(request.url).searchParams.get("global") === "true"
    ) response = await logout(request);
    return withCors(
      request,
      response ?? Response.json({ error: "not_found" }, { status: 404 }),
    );
  }

  function isTrustedOrigin(value: string) {
    try {
      return trustedOrigins.has(new URL(value).origin);
    } catch {
      return false;
    }
  }

  function withCors(request: Request, response: Response) {
    const value = request.headers.get("origin");
    if (!value || !isTrustedOrigin(value)) return response;
    const origin = new URL(value).origin;
    response.headers.set("access-control-allow-origin", origin);
    response.headers.set("access-control-allow-credentials", "true");
    response.headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    response.headers.set("access-control-allow-headers", "Content-Type");
    response.headers.append("vary", "Origin");
    return response;
  }

  return {
    paths,
    callbackUrl,
    login,
    callback,
    config,
    passwordLogin,
    passwordSignup,
    magicLink,
    profile,
    userProfile,
    logout,
    getSession,
    getBootstrap,
    handle,
  };
}

function createRequestAwareSsoServer<TUser extends SsoUser>(
  options: CreateSsoServerOptions<TUser> & {
    clientId: string;
    sessionSecret: string | Uint8Array;
    baseUrl: string;
  },
): SsoServer<TUser> {
  const paths = normalizePaths(options.paths);
  const servers = new Map<string, SsoServer<TUser>>();
  const serverFor = (request: SsoSessionRequest) => {
    const appUrl = inferRequestOrigin(request);
    const cached = servers.get(appUrl);
    if (cached) return cached;
    const server = createSsoServer<TUser>({ ...options, appUrl });
    servers.set(appUrl, server);
    return server;
  };

  return {
    paths,
    // The absolute callback is request-dependent; adapters register this path
    // on the inferred application origin.
    callbackUrl: paths.callback,
    login: (request) => serverFor(request).login(request),
    callback: (request) => serverFor(request).callback(request),
    config: async () => Response.json(
      { error: "request_required" },
      { status: 400 },
    ),
    passwordLogin: (request) => serverFor(request).passwordLogin(request),
    passwordSignup: (request) => serverFor(request).passwordSignup(request),
    magicLink: (request) => serverFor(request).magicLink(request),
    profile: (request) => serverFor(request).profile(request),
    userProfile: (request) => serverFor(request).userProfile(request),
    logout: (request) => serverFor(request).logout(request),
    getSession: (request) => serverFor(request).getSession(request),
    getBootstrap: (request) => serverFor(request).getBootstrap(request),
    handle: (request) => serverFor(request).handle(request),
  };
}

function inferRequestOrigin(request: SsoSessionRequest): string {
  if (request instanceof Request) return new URL(request.url).origin;
  const host = request.get("x-forwarded-host")?.split(",")[0]?.trim()
    ?? request.get("host")?.split(",")[0]?.trim();
  if (!host) {
    throw new Error("SSO could not infer the application URL; pass appUrl explicitly");
  }
  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto
    ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return new URL(`${protocol}://${host}`).origin;
}

function parseSocialProvider(value: string | null) {
  return value === "google" || value === "facebook" || value === "linkedin" || value === "github"
    ? value
    : undefined;
}

function popupCompletionResponse(options: {
  returnTo: string;
  openerOrigin: string;
  error?: string;
  message?: string;
  cookies: string[];
}) {
  const payload = jsonForInlineScript({
    type: "skycanvas:sso:complete",
    returnTo: options.returnTo,
    ...(options.error ? { error: options.error } : {}),
    ...(options.message ? { message: options.message } : {}),
  });
  const origin = jsonForInlineScript(options.openerOrigin);
  const fallback = jsonForInlineScript(new URL(options.returnTo, options.openerOrigin).toString());
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signed in</title></head><body><script>if(window.opener){window.opener.postMessage(${payload},${origin});window.close()}else{window.location.replace(${fallback})}</script></body></html>`;
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  });
  for (const cookie of options.cookies) headers.append("set-cookie", cookie);
  return new Response(html, { status: 200, headers });
}

function jsonForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
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

function normalizeCookieOptions(
  options: SsoCookieOptions | undefined,
  appOrigin: string,
  clientId: string,
): NormalizedCookieOptions {
  const secure = options?.secure ?? appOrigin.startsWith("https:");
  const sameSite = options?.sameSite ?? "lax";
  const clientSuffix = clientId.replace(/[^A-Za-z0-9_-]/g, "_").slice(-32);
  if (sameSite === "none" && !secure) throw new Error("SSO SameSite=None cookies must be Secure");
  return {
    flowName: options?.flowName ?? `sso_flow_${clientSuffix}`,
    sessionName: options?.sessionName ?? `sso_session_${clientSuffix}`,
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

function readCookie(request: SsoSessionRequest, name: string): string {
  const headers = request instanceof Headers ? request : request.headers;
  const value = headers.get("cookie")?.split(";")
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
  if (typeof secret !== "string" && !(secret instanceof Uint8Array)) {
    throw new Error("SSO sessionSecret is required");
  }
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

function requireValue(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`SSO ${name} is required`);
}

function requireOrigin(value: unknown, name: string): string {
  requireValue(value, name);
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`SSO ${name} must be a valid absolute URL`);
  }
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}
