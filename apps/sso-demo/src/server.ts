import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const render = createStartHandler(defaultStreamHandler);

const fetch = async (request: Request) => {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/api/better-auth/")) {
    const { betterAuthServer } = await import("./lib/better-auth.server");
    return betterAuthServer.handler(request);
  }
  if (pathname.startsWith("/auth/")) {
    const { skycanvas } = await import("./lib/sso.server");
    return skycanvas.handle(request);
  }
  return render(request);
};

export type ServerEntry = { fetch: (request: Request) => Promise<Response> };
export default { fetch } satisfies ServerEntry;
