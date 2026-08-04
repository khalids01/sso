import { createServerFn } from "@tanstack/react-start";
import { getTanStackStandaloneSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start";

export const getSsoBootstrap = createServerFn({ method: "GET" }).handler(
  () => getTanStackStandaloneSsoBootstrap(
    () => import("./sso.server").then(({ sso }) => sso),
  ),
);
