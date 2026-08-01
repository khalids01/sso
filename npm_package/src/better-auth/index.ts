import { createSsoProvider } from "../index.js";
import { verifySsoIdToken } from "../server/index.js";

export interface BetterAuthTokenSet {
  idToken?: string | undefined;
}

export interface CreateSsoBetterAuthProviderOptions {
  clientId: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export function createSsoBetterAuthProvider(options: CreateSsoBetterAuthProviderOptions) {
  const provider = createSsoProvider(options);
  return {
    providerId: provider.providerId,
    clientId: provider.clientId,
    authorizationUrl: provider.authorizationUrl,
    tokenUrl: provider.tokenUrl,
    scopes: provider.scopes,
    pkce: provider.pkce,
    getUserInfo: async (tokens: BetterAuthTokenSet) => {
      if (!tokens.idToken) return null;
      try {
        const identity = await verifySsoIdToken({
          clientId: options.clientId,
          idToken: tokens.idToken,
          ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
          ...(options.fetch ? { fetch: options.fetch } : {}),
        });
        return { ...identity.user, image: identity.user.image ?? undefined };
      } catch {
        return null;
      }
    },
  };
}
