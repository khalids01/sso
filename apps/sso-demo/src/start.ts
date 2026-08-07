import { createServerOnlyFn, createStart } from "@tanstack/react-start";
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start";

const loadSkycanvas = createServerOnlyFn(() =>
  import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
);
const skycanvasMiddleware = createTanStackSsoMiddleware(loadSkycanvas);

export const startInstance = createStart(() => ({
  requestMiddleware: [skycanvasMiddleware],
}));
