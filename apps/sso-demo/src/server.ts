import { createStartHandler, defaultStreamHandler, type RequestHandler } from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { endSession, finishAuthorization, startAuthorization } from "./lib/auth.server";

const fetch = createStartHandler(async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname === "/auth/start" && context.request.method === "GET") {
    return startAuthorization(context.request);
  }
  if (url.pathname === "/auth/callback" && context.request.method === "GET") {
    return finishAuthorization(context.request);
  }
  if (url.pathname === "/auth/logout" && context.request.method === "POST") {
    return endSession(context.request);
  }
  return defaultStreamHandler(context);
});

export type ServerEntry = { fetch: RequestHandler<Register> };
export default { fetch } satisfies ServerEntry;
