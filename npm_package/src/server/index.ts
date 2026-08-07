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
  config: string;
  passwordLogin: string;
  passwordSignup: string;
  magicLink: string;
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
  interactionMode?: "hosted" | "embedded";
  oauthMode?: "redirect" | "popup";
  onSignIn?: (context: SsoSignInContext) => TUser | Promise<TUser>;
  onError?: (error: unknown, request: Request) => void;
}

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
  logout: "/auth/logout",
};

const pendingCallbacks = new Map<string, Promise<Response>>();

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
  const appOrigin = requireOrigin(options.appUrl, "appUrl");
  const baseUrl = options.baseUrl === undefined ? undefined : requireOrigin(options.baseUrl, "baseUrl");
  const redirectOrigin = requireOrigin(options.redirectOrigin ?? appOrigin, "redirectOrigin");
  const paths = normalizePaths(options.paths);
  const callbackUrl = new URL(paths.callback, appOrigin).toString();
  const flowTtl = positiveInteger(options.flowTtlSeconds ?? 600, "flowTtlSeconds");
  const sessionTtl = positiveInteger(options.sessionTtlSeconds ?? 600, "sessionTtlSeconds");
  const cookieConfig = normalizeCookieOptions(options.cookies, appOrigin, options.clientId);
  const trustedOrigins = new Set([
    appOrigin,
    redirectOrigin,
    ...(options.trustedOrigins ?? []).map((origin) => new URL(origin).origin),
  ]);
  const key = createSessionKey(options.sessionSecret);
  const clientConfig: StandaloneSsoClientConfig = {
    baseUrl: appOrigin,
    loginPath: paths.login,
    configPath: paths.config,
    passwordLoginPath: paths.passwordLogin,
    passwordSignupPath: paths.passwordSignup,
    magicLinkPath: paths.magicLink,
    profilePath: paths.profile,
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
      clientId: options.clientId,
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
    try {
      const url = new URL(request.url);
      if (url.searchParams.has("error")) throw new Error("SSO authorization was denied");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) throw new Error("SSO callback is missing code or state");
      const flow = await unseal<SsoAuthorizationFlow>(readCookie(request, cookieConfig.flowName), key);
      if (flow.state !== state) throw new Error("SSO state mismatch");

      const callbackKey = `${options.clientId}:${state}`;
      const existing = pendingCallbacks.get(callbackKey);
      if (existing) return (await existing).clone();

      const pending = (async () => {
        const authorization = await finishSsoAuthorization({
          clientId: options.clientId,
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
        const session: SsoSession<TUser> = { user, expiresAt: Date.now() + seconds * 1000 };
        const sessionCookie = serializeCookie(
          cookieConfig.sessionName,
          await seal(session, seconds, key),
          seconds,
          cookieConfig,
        );
        const flowCookie = serializeCookie(cookieConfig.flowName, "", 0, cookieConfig);
        return flow.popup
          ? popupCompletionResponse(authorization.returnTo, appOrigin, sessionCookie, flowCookie)
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

  async function getSession(request: SsoSessionRequest): Promise<SsoSession<TUser> | null> {
    try {
      const session = await unseal<SsoSession<TUser>>(readCookie(request, cookieConfig.sessionName), key);
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
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
        options.clientId,
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
    if (origin && origin !== appOrigin) {
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
      clientId: options.clientId,
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
        clientId: options.clientId,
        redirectUri: callbackUrl,
        origin: appOrigin,
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
    if (origin && origin !== appOrigin) {
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
      clientId: options.clientId,
      redirectUri: callbackUrl,
      returnTo,
      ...(baseUrl ? { baseUrl } : {}),
    });
    const target = new URL("/auth/sdk/magic-link", baseUrl ?? getSsoEndpoints().authorization);
    const response = await getFetch(options.fetch)(target, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        clientId: options.clientId,
        redirectUri: callbackUrl,
        origin: appOrigin,
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

  async function logout(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const origin = request.headers.get("origin");
    if (origin && !trustedOrigins.has(new URL(origin).origin)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    const global = requestUrl.searchParams.get("global") === "true";
    const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));
    const globalLogoutUrl = new URL(getSsoEndpoints(baseUrl).globalLogout);
    globalLogoutUrl.searchParams.set("client_id", options.clientId);
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
    if (pathname === paths.login && request.method === "GET") return login(request);
    if (pathname === paths.callback && request.method === "GET") return callback(request);
    if (pathname === paths.config && request.method === "GET") return config();
    if (pathname === paths.passwordLogin && request.method === "POST") return passwordLogin(request);
    if (pathname === paths.passwordSignup && request.method === "POST") return passwordSignup(request);
    if (pathname === paths.magicLink && request.method === "POST") return magicLink(request);
    if (pathname === paths.profile && request.method === "GET") return profile(request);
    if (pathname === paths.logout && request.method === "POST") return logout(request);
    if (
      pathname === paths.logout &&
      request.method === "GET" &&
      new URL(request.url).searchParams.get("global") === "true"
    ) return logout(request);
    return Response.json({ error: "not_found" }, { status: 404 });
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
    logout,
    getSession,
    getBootstrap,
    handle,
  };
}

function parseSocialProvider(value: string | null) {
  return value === "google" || value === "facebook" || value === "linkedin" || value === "github"
    ? value
    : undefined;
}

function popupCompletionResponse(
  returnTo: string,
  appOrigin: string,
  ...cookies: string[]
) {
  const payload = jsonForInlineScript({ type: "skycanvas:sso:complete", returnTo });
  const origin = jsonForInlineScript(appOrigin);
  const fallback = jsonForInlineScript(new URL(returnTo, appOrigin).toString());
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signed in</title></head><body><script>if(window.opener){window.opener.postMessage(${payload},${origin});window.close()}else{window.location.replace(${fallback})}</script></body></html>`;
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
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
