import { Elysia } from "elysia";

import { isOriginRegisteredForActiveClient } from "../oauth/oauth-token.service";

const browserAuthPaths = [
  "/auth/sdk/magic-link",
  "/auth/sdk/password/login",
  "/auth/sdk/password/signup",
  "/auth/sdk/password/request-reset",
] as const;

const corsHeaders = (origin: string) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "Content-Type",
  "access-control-max-age": "300",
  "access-control-allow-credentials": "true",
  vary: "Origin",
});

/** Handles preflight without opening embedded auth to arbitrary websites. */
export const browserAuthCorsController = new Elysia({ name: "browser-auth-cors" });

for (const path of browserAuthPaths) {
  browserAuthCorsController.options(path, async ({ request }) => {
    const origin = normalizeOrigin(request.headers.get("origin"));
    if (!origin || !(await isOriginRegisteredForActiveClient(origin))) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  });
}

/**
 * Bind a browser request's real Origin header to the origin validated from the
 * application client. Server-to-server adapters intentionally have no Origin.
 */
export function allowEmbeddedBrowserOrigin(input: {
  request: Request;
  claimedOrigin: string;
  set: { headers: Record<string, string | number | string[]> };
}) {
  const requestOrigin = normalizeOrigin(input.request.headers.get("origin"));
  const claimedOrigin = new URL(input.claimedOrigin).origin;
  if (!requestOrigin) return;
  if (requestOrigin !== claimedOrigin) {
    throw new Error("Embedded auth request origin mismatch");
  }
  Object.assign(input.set.headers, corsHeaders(requestOrigin));
}

/** Forward only Better Auth's central-domain session cookies after success. */
export function forwardCentralAuthCookies(
  response: Response,
  set: { headers: Record<string, string | number | string[]> },
) {
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) set.headers["set-cookie"] = cookies;
}

/** Better Auth is called internally after application-origin validation. */
export function getCentralAuthHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("origin");
  headers.delete("referer");
  return headers;
}

function normalizeOrigin(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
