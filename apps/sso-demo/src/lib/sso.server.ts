import { createSsoServer } from "@skycanvasstudio/sso/server";
import { createDemoUser } from "./demo-user.server";
import { getDemoSsoConfig } from "./sso-config.server";
import type { DemoUser } from "./sso-types";

const config = getDemoSsoConfig();

export const sso = createSsoServer<DemoUser>({
  clientId: config.clientId,
  appUrl: config.appUrl,
  baseUrl: config.ssoUrl,
  sessionSecret: config.sessionSecret,
  onSignIn: createDemoUser,
  onError(error) {
    console.error("[sso-demo] SSO callback failed", error);
  },
});