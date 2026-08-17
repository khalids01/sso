import { genericOAuthClient } from "better-auth/client/plugins";
import { genericOAuth } from "better-auth/plugins";

import {
  createSsoBetterAuthIntegration,
  type SsoBetterAuthIntegration,
  type SsoBetterAuthIntegrationOptions,
} from "../index.js";

/** Add SkyCanvas to Better Auth with one server plugin. */
export function skycanvas(
  options: SsoBetterAuthIntegrationOptions,
): ReturnType<typeof genericOAuth> & SsoBetterAuthIntegration {
  const integration = createSsoBetterAuthIntegration(options);
  return Object.assign(
    genericOAuth({ config: [integration.provider] }),
    integration,
  );
}

/** Matching Better Auth browser plugin used by createAuthClient(). */
export function skycanvasClient() {
  return genericOAuthClient();
}

export {
  createSsoBetterAuthIntegration,
  type BetterAuthSsoActions,
  type SsoBetterAuthIntegrationOptions,
  type SsoBetterAuthBootstrap,
  type SsoBetterAuthIntegration,
  type SsoPublicConfig,
} from "../index.js";
