import { AsyncLocalStorage } from "node:async_hooks";
import { facebook, github, google } from "better-auth/social-providers";
import type { BetterAuthPlugin } from "better-auth";
import { captureOAuthProfile } from "./oauth-profile.server";

export const applicationSocialProviderIds = [
  "google",
  "facebook",
  "github",
] as const;

export type ApplicationSocialProviderId =
  (typeof applicationSocialProviderIds)[number];

export type ApplicationSocialProviderCredentials = {
  clientId: string;
  clientSecret: string;
};

const credentialContext = new AsyncLocalStorage<
  Partial<Record<ApplicationSocialProviderId, ApplicationSocialProviderCredentials>>
>();

export function runWithApplicationSocialProviderCredentials<T>(
  provider: ApplicationSocialProviderId,
  credentials: ApplicationSocialProviderCredentials,
  operation: () => T,
) {
  return credentialContext.run({ [provider]: credentials }, operation);
}

function requireCredentials(provider: ApplicationSocialProviderId) {
  const credentials = credentialContext.getStore()?.[provider];
  if (!credentials) {
    throw new Error(`Missing ${provider} credentials for this OAuth request`);
  }
  return credentials;
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
            () =>
              google({
                ...requireCredentials("google"),
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
                mapProfileToUser: (profile) =>
                  captureOAuthProfile("google", profile),
              }),
            () =>
              facebook({
                ...requireCredentials("facebook"),
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
                mapProfileToUser: (profile) =>
                  captureOAuthProfile("facebook", profile),
              }),
            () =>
              github({
                ...requireCredentials("github"),
                disableImplicitSignUp: true,
                overrideUserInfoOnSignIn: true,
                mapProfileToUser: (profile) =>
                  captureOAuthProfile("github", profile),
              }),
          ],
        },
      } as never;
    },
  };
}
