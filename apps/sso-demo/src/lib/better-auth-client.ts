import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { createSsoBetterAuthReact } from "@skycanvasstudio/sso/react";

export const betterAuthClient = createAuthClient({
  basePath: "/api/better-auth",
  plugins: [genericOAuthClient()],
});

export const {
  SsoProvider: BetterAuthSsoProvider,
  useSso: useBetterAuthSso,
} = createSsoBetterAuthReact(betterAuthClient);
