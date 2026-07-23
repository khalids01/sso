import { AsyncLocalStorage } from "node:async_hooks";
import {
  facebook,
  github,
  google,
  linkedin,
} from "better-auth/social-providers";
import type { BetterAuthPlugin } from "better-auth";
import {
  captureOAuthProfile,
  namespaceOAuthAccountId,
} from "./oauth-profile.server";

export const applicationSocialProviderIds = [
  "google",
  "facebook",
  "github",
  "linkedin",
] as const;

export type ApplicationSocialProviderId =
  (typeof applicationSocialProviderIds)[number];

export type OAuthProviderConnectionCredentials = {
  id: string;
  provider: ApplicationSocialProviderId;
  clientId: string;
  clientSecret: string;
  credentialVersion: number;
};

const connectionContext =
  new AsyncLocalStorage<OAuthProviderConnectionCredentials>();

export function runWithOAuthProviderConnection<T>(
  connection: OAuthProviderConnectionCredentials,
  operation: () => T,
) {
  return connectionContext.run(connection, operation);
}

function requireConnection(provider: ApplicationSocialProviderId) {
  const connection = connectionContext.getStore();
  if (!connection || connection.provider !== provider) {
    throw new Error(`Missing ${provider} connection for this OAuth request`);
  }
  return connection;
}

export function dynamicApplicationSocialProviders(): BetterAuthPlugin {
  return {
    id: "dynamic-application-social-providers",
    init(context) {
      const retainedProviders = context.socialProviders.filter(
        (provider) =>
          !applicationSocialProviderIds.includes(
            provider.id as ApplicationSocialProviderId,
          ),
      );

      return {
        context: {
          socialProviders: [
            ...retainedProviders,
            () => {
              const connection = requireConnection("google");
              const provider = google({
                clientId: connection.clientId,
                clientSecret: connection.clientSecret,
                disableDefaultScope: true,
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
              });
              const getUserInfo = provider.getUserInfo;
              return {
                ...provider,
                async getUserInfo(token: Parameters<typeof getUserInfo>[0]) {
                  const result = await getUserInfo(token);
                  if (!result) return null;
                  const providerAccountId = String(result.user.id);
                  await captureOAuthProfile(
                    "google",
                    result.data ?? result.user,
                    connection.id,
                    providerAccountId,
                  );
                  return {
                    ...result,
                    user: {
                      ...result.user,
                      id: namespaceOAuthAccountId(
                        connection.id,
                        providerAccountId,
                      ),
                    },
                  };
                },
              };
            },
            () => {
              const connection = requireConnection("facebook");
              const provider = facebook({
                clientId: connection.clientId,
                clientSecret: connection.clientSecret,
                disableDefaultScope: true,
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
              });
              const getUserInfo = provider.getUserInfo;
              return {
                ...provider,
                async getUserInfo(token: Parameters<typeof getUserInfo>[0]) {
                  const result = await getUserInfo(token);
                  if (!result) return null;
                  const providerAccountId = String(result.user.id);
                  await captureOAuthProfile(
                    "facebook",
                    result.data ?? result.user,
                    connection.id,
                    providerAccountId,
                  );
                  return {
                    ...result,
                    user: {
                      ...result.user,
                      id: namespaceOAuthAccountId(
                        connection.id,
                        providerAccountId,
                      ),
                    },
                  };
                },
              };
            },
            () => {
              const connection = requireConnection("github");
              const provider = github({
                clientId: connection.clientId,
                clientSecret: connection.clientSecret,
                disableDefaultScope: true,
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
              });
              const getUserInfo = provider.getUserInfo;
              return {
                ...provider,
                async getUserInfo(token: Parameters<typeof getUserInfo>[0]) {
                  const result = await getUserInfo(token);
                  if (!result) return null;
                  const providerAccountId = String(result.user.id);
                  await captureOAuthProfile(
                    "github",
                    result.data ?? result.user,
                    connection.id,
                    providerAccountId,
                  );
                  return {
                    ...result,
                    user: {
                      ...result.user,
                      id: namespaceOAuthAccountId(
                        connection.id,
                        providerAccountId,
                      ),
                    },
                  };
                },
              };
            },
            () => {
              const connection = requireConnection("linkedin");
              const provider = linkedin({
                clientId: connection.clientId,
                clientSecret: connection.clientSecret,
                disableDefaultScope: true,
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
              });
              const getUserInfo = provider.getUserInfo;
              return {
                ...provider,
                async getUserInfo(token: Parameters<typeof getUserInfo>[0]) {
                  const result = await getUserInfo(token);
                  if (!result) return null;
                  const providerAccountId = String(result.user.id);
                  await captureOAuthProfile(
                    "linkedin",
                    result.data ?? result.user,
                    connection.id,
                    providerAccountId,
                  );
                  return {
                    ...result,
                    user: {
                      ...result.user,
                      id: namespaceOAuthAccountId(
                        connection.id,
                        providerAccountId,
                      ),
                    },
                  };
                },
              };
            },
          ],
        },
      } as never;
    },
  };
}
