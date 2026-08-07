import { createSsoBetterAuthIntegration } from "@skycanvasstudio/sso/better-auth";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getDemoSsoConfig } from "./sso-config.server";

const config = getDemoSsoConfig();

export const skycanvasBetterAuth = createSsoBetterAuthIntegration({
  clientId: config.betterAuthClientId,
  baseUrl: config.ssoUrl,
});

export const betterAuthServer = betterAuth({
  baseURL: config.appUrl,
  basePath: "/api/better-auth",
  secret: config.sessionSecret,
  trustedOrigins: [config.appUrl],
  advanced: { cookiePrefix: "sso-demo-better-auth" },
  account: { encryptOAuthTokens: true },
  plugins: [
    genericOAuth({ config: [skycanvasBetterAuth.provider] }),
    tanstackStartCookies(),
  ],
});
