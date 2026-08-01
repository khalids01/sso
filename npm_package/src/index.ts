export const SSO_DEFAULT_URL = "https://api-sso.skycanvasstudio.com";
export const SSO_PROVIDER_ID = "skycanvas";
export const SSO_SCOPE = "openid";

export interface SsoEndpoints {
  authorization: string;
  token: string;
  jwks: string;
  clientMetadata: (clientId: string) => string;
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
  const origin = new URL(baseUrl).origin;
  return {
    authorization: new URL("/api/auth/oauth2/authorize", origin).toString(),
    token: new URL("/api/auth/oauth2/token", origin).toString(),
    jwks: new URL("/api/auth/jwks", origin).toString(),
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

export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function requireValue(value: string, name: string): void {
  if (!value.trim()) throw new Error(`SSO ${name} is required`);
}
