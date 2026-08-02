import {
  createStartHandler,
  defaultStreamHandler,
  type RequestHandler,
} from "@tanstack/react-start/server";
import type { Register } from "@tanstack/react-router";
import { handleSsoRequest } from "./lib/sso.server";

const fetch = createStartHandler(async (context) => {
  if (new URL(context.request.url).pathname.startsWith("/auth/")) {
    return handleSsoRequest(context.request);
  }
  return defaultStreamHandler(context);
});

export type ServerEntry = { fetch: RequestHandler<Register> };
export default { fetch } satisfies ServerEntry;
