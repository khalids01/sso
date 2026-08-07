import { createServerFn } from "@tanstack/react-start";

export const getSsoBootstrap = createServerFn({ method: "GET" }).handler(
  () => import("./sso.server").then(({ skycanvas }) => skycanvas.getBootstrap()),
);
