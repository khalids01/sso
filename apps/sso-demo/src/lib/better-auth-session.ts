import { createServerFn } from "@tanstack/react-start";
import { getTanStackBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start";

export const getBetterAuthBootstrap = createServerFn({ method: "GET" }).handler(
  () => getTanStackBetterAuthSsoBootstrap(async () => {
    const { betterAuthServer, skycanvasBetterAuth } = await import("./better-auth.server");
    return { auth: betterAuthServer, skycanvas: skycanvasBetterAuth };
  }),
);
