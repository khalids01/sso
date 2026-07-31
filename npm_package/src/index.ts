export const FREE_SSO_DEFAULT_URL = "https://api-sso.skycanvasstudio.com";
export const FREE_SSO_PROVIDER_ID = "skycanvas";
export const FREE_SSO_SCOPE = "openid";

export interface FreeSsoEndpoints {
  authorization: string;
  token: string;
  jwks: string;
  clientMetadata: (clientId: string) => string;
}

export interface FreeSsoUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface FreeSsoSession<TUser extends FreeSsoUser = FreeSsoUser> {
  user: TUser;
  expiresAt?: number;
}

export interface FreeSsoClientMetadata {
  client_id: string;
  application_id: string;
  audience: string;
  issuer: string;
}

export interface FreeSsoTokenResponse {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: "openid";
}

export function getFreeSsoEndpoints(baseUrl = FREE_SSO_DEFAULT_URL): FreeSsoEndpoints {
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

export function safeReturnTo(value: string | null | undefined, fallback = "/"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
