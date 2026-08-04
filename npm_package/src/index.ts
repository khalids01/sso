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

interface BetterAuthTokenSet {
  idToken?: string | undefined;
}

export interface SsoBetterAuthIntegrationOptions extends CreateSsoProviderOptions {
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
  provider: ReturnType<typeof createBetterAuthProvider>;
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

export interface BetterAuthSsoActions {
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

function createBetterAuthProvider(options: SsoBetterAuthIntegrationOptions) {
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
  options: SsoBetterAuthIntegrationOptions,
): SsoBetterAuthIntegration {
  requireValue(options.clientId, "clientId");
  const baseUrl = requireOrigin(options.baseUrl, "baseUrl");
  const provider = createBetterAuthProvider({ ...options, baseUrl });
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
