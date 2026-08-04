export const SSO_DEFAULT_URL = "https://api-sso.skycanvasstudio.com";
export const SSO_PROVIDER_ID = "skycanvas";
export const SSO_SCOPE = "openid";

export interface SsoEndpoints {
  authorization: string;
  token: string;
  jwks: string;
  clientMetadata: (clientId: string) => string;
  globalLogout: string;
}

export interface SsoProvider {
  providerId: typeof SSO_PROVIDER_ID;
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  metadataUrl: string;
  scopes: [typeof SSO_SCOPE];
  pkce: true;
}

export interface CreateSsoProviderOptions {
  clientId: string;
  baseUrl?: string;
}

export interface BetterAuthTokenSet {
  idToken?: string | undefined;
}

export interface CreateSsoBetterAuthProviderOptions extends CreateSsoProviderOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  forceLogin?: boolean;
}

export interface SsoPublicConfig {
  providerId: typeof SSO_PROVIDER_ID;
  clientId: string;
  baseUrl: string;
}

export interface SsoBetterAuthBootstrap<TSession> {
  kind: "better-auth";
  config: SsoPublicConfig;
  session: TSession | null;
}

export interface SsoBetterAuthIntegration {
  provider: ReturnType<typeof createSsoBetterAuthProvider>;
  config: SsoPublicConfig;
  createBootstrap: <TSession>(session: TSession | null) => SsoBetterAuthBootstrap<TSession>;
}

type BetterAuthResult = { error?: unknown };

export interface BetterAuthClientLike {
  signIn: {
    oauth2: (input: {
      providerId: typeof SSO_PROVIDER_ID;
      callbackURL: string;
    }) => Promise<BetterAuthResult>;
  };
  signOut: () => Promise<BetterAuthResult>;
}

export interface BetterAuthSsoClientOptions {
  authClient: BetterAuthClientLike;
  clientId: string;
  baseUrl?: string;
  appUrl?: string;
  navigate?: (url: string) => void;
}

export interface BetterAuthSsoClient {
  signIn: (callbackURL?: string) => Promise<BetterAuthResult>;
  signOut: (options?: { global?: boolean; returnTo?: string }) => Promise<BetterAuthResult>;
}

export interface SsoUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface SsoSession<TUser extends SsoUser = SsoUser> {
  user: TUser;
  expiresAt: number;
}

export interface SsoClientMetadata {
  client_id: string;
  application_id: string;
  audience: string;
  issuer: string;
}

export interface SsoTokenResponse {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: typeof SSO_SCOPE;
}

export function getSsoEndpoints(baseUrl = SSO_DEFAULT_URL): SsoEndpoints {
  const origin = requireOrigin(baseUrl, "baseUrl");
  return {
    authorization: new URL("/api/auth/oauth2/authorize", origin).toString(),
    token: new URL("/api/auth/oauth2/token", origin).toString(),
    jwks: new URL("/api/auth/jwks", origin).toString(),
    globalLogout: new URL("/api/auth/global-sign-out", origin).toString(),
    clientMetadata: (clientId) => {
      const url = new URL("/api/oauth/client-metadata", origin);
      url.searchParams.set("client_id", clientId);
      return url.toString();
    },
  };
}

export function createSsoProvider(options: CreateSsoProviderOptions): SsoProvider {
  requireValue(options.clientId, "clientId");
  const endpoints = getSsoEndpoints(options.baseUrl);
  return {
    providerId: SSO_PROVIDER_ID,
    clientId: options.clientId,
    authorizationUrl: endpoints.authorization,
    tokenUrl: endpoints.token,
    jwksUrl: endpoints.jwks,
    metadataUrl: endpoints.clientMetadata(options.clientId),
    scopes: [SSO_SCOPE],
    pkce: true,
  };
}

/**
 * @deprecated Prefer createSsoBetterAuthIntegration so the browser receives
 * public SSO configuration through the server-rendered bootstrap.
 */
export function createSsoBetterAuthProvider(options: CreateSsoBetterAuthProviderOptions) {
  requireValue(options.baseUrl, "baseUrl");
  const provider = createSsoProvider(options);
  return {
    providerId: provider.providerId,
    clientId: provider.clientId,
    authorizationUrl: provider.authorizationUrl,
    tokenUrl: provider.tokenUrl,
    scopes: provider.scopes,
    pkce: provider.pkce,
    ...(options.forceLogin === true ? { prompt: "login" as const } : {}),
    getUserInfo: async (tokens: BetterAuthTokenSet) => {
      if (!tokens.idToken) return null;
      try {
        const { verifySsoIdToken } = await import("./server/index.js");
        const identity = await verifySsoIdToken({
          clientId: options.clientId,
          idToken: tokens.idToken,
          baseUrl: options.baseUrl,
          ...(options.fetch ? { fetch: options.fetch } : {}),
        });
        return { ...identity.user, image: identity.user.image ?? undefined };
      } catch {
        return null;
      }
    },
  };
}

export function createSsoBetterAuthIntegration(
  options: CreateSsoBetterAuthProviderOptions,
): SsoBetterAuthIntegration {
  requireValue(options.clientId, "clientId");
  const baseUrl = requireOrigin(options.baseUrl, "baseUrl");
  const provider = createSsoBetterAuthProvider({ ...options, baseUrl });
  const config: SsoPublicConfig = {
    providerId: SSO_PROVIDER_ID,
    clientId: options.clientId,
    baseUrl,
  };

  return {
    provider,
    config,
    createBootstrap<TSession>(session: TSession | null): SsoBetterAuthBootstrap<TSession> {
      return {
        kind: "better-auth",
        config: { ...config },
        session: session ?? null,
      };
    },
  };
}

/**
 * @deprecated Prefer createSsoBetterAuthReact and pass it the bootstrap made
 * by createSsoBetterAuthIntegration.
 */
export function createSsoBetterAuthClient(
  options: BetterAuthSsoClientOptions,
): BetterAuthSsoClient {
  requireValue(options.clientId, "clientId");
  const baseUrl = options.baseUrl === undefined ? undefined : requireOrigin(options.baseUrl, "baseUrl");
  const appUrl = options.appUrl === undefined ? undefined : requireOrigin(options.appUrl, "appUrl");

  const signIn = (callbackURL = "/") => options.authClient.signIn.oauth2({
    providerId: SSO_PROVIDER_ID,
    callbackURL,
  });

  return {
    signIn,
    async signOut(signOutOptions = {}) {
      const result = await options.authClient.signOut();
      if (result.error || signOutOptions.global === false) return result;

      const appOrigin = getBrowserOrigin(appUrl);
      const returnTo = new URL(
        safeReturnTo(signOutOptions.returnTo),
        appOrigin,
      );
      const logoutUrl = new URL(getSsoEndpoints(baseUrl).globalLogout);
      logoutUrl.searchParams.set("client_id", options.clientId);
      logoutUrl.searchParams.set("return_to", returnTo.toString());
      (options.navigate ?? defaultBrowserNavigate)(logoutUrl.toString());
      return result;
    },
  };
}

export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function requireValue(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`SSO ${name} is required`);
  }
}

function requireOrigin(value: unknown, name: string): string {
  requireValue(value, name);
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`SSO ${name} must be a valid absolute URL`);
  }
}

function getBrowserOrigin(appUrl?: string) {
  if (appUrl) return new URL(appUrl).origin;
  if (typeof window !== "undefined") return window.location.origin;
  throw new Error("SSO global logout requires appUrl outside a browser");
}

function defaultBrowserNavigate(url: string) {
  if (typeof window === "undefined") {
    throw new Error("SSO navigation requires a browser or custom navigate function");
  }
  window.location.assign(url);
}
