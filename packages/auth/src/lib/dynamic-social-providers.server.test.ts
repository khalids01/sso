import { describe, expect, it, mock } from "bun:test";

mock.module("./oauth-profile.server", () => ({
  captureOAuthProfile: mock(async () => undefined),
  namespaceOAuthAccountId: (connectionId: string, accountId: string) =>
    `${connectionId}:${accountId}`,
}));

describe("dynamicApplicationSocialProviders", () => {
  it("builds only the provider selected by the request connection", async () => {
    const {
      applicationSocialProviderIds,
      dynamicApplicationSocialProviders,
      runWithOAuthProviderConnection,
    } = await import("./dynamic-social-providers.server");
    const plugin = dynamicApplicationSocialProviders();
    const initialized = plugin.init?.({ socialProviders: [] } as never) as {
      context: {
        socialProviders: Array<() => { id: string }>;
      };
    };
    const providerFactory = initialized.context.socialProviders[0]!;

    for (const provider of applicationSocialProviderIds) {
      const configuredProvider = runWithOAuthProviderConnection(
        {
          id: `${provider}-connection`,
          provider,
          clientId: `${provider}-client-id`,
          clientSecret: `${provider}-client-secret`,
          credentialVersion: 1,
        },
        providerFactory,
      );

      expect(configuredProvider.id).toBe(provider);
    }
  });
});
