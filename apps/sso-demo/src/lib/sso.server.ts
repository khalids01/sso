import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start";
import { createDemoUser } from "./demo-user.server";
import { getDemoSsoConfig } from "./sso-config.server";
import type { DemoUser } from "./sso-types";

const config = getDemoSsoConfig();

export const skycanvas = createTanStackSso<DemoUser>({
  publishableKey: config.clientId,
  secretKey: config.sessionSecret,
  appUrl: config.appUrl,
  ssoUrl: config.ssoUrl,
  interactionMode: "embedded",
  oauthMode: "popup",
  onSignIn: createDemoUser,
});
