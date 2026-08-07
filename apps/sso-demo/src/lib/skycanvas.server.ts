import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start";
import { env } from "./env";

export const skycanvas = createTanStackSso({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
  interactionMode: "embedded", // "hosted" redirects to the SSO auth page
  oauthMode: "popup", // or "redirect"
});
