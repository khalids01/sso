import { cors } from "@elysiajs/cors";
import { auth } from "@auth/server";
import { env } from "@env/server";
import { connectRedis } from "@redis/server";
import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import { app } from "./modules/app";
import { openapi } from "@elysiajs/openapi";
import { enforceRateLimit } from "./modules/rate-limit/rate-limit.service";
import { startVisitorFlushWorker } from "./modules/visitors/visitors.service";
import { securityHeadersPlugin } from "./plugins/security-headers";
import { oauthTokenController } from "./modules/oauth/oauth-token.controller";
import { startApplicationRevocationWorker } from "./modules/application-revocation/revocation.service";
import { observeBetterAuthFailure } from "./modules/auth/auth-observability.service";
import {
  runWithApplicationSocialProviderCredentials,
  type ApplicationSocialProviderId,
} from "@auth/server";
import {
  clearSocialProviderContextCookie,
  getClientSocialProviderCredentials,
  readCookie,
  socialProviderContextCookieName,
  verifySocialProviderContext,
} from "./modules/auth/social-provider-credentials.service";

async function handleBetterAuthRequest(request: Request) {
  const match = new URL(request.url).pathname.match(
    /^\/api\/auth\/callback\/(google|facebook|github)\/?$/,
  );
  if (!match) return auth.handler(request);
  const provider = match[1] as ApplicationSocialProviderId;
  const signedContext = readCookie(
    request,
    socialProviderContextCookieName(provider),
  );
  const context = signedContext
    ? verifySocialProviderContext(signedContext)
    : null;
  if (!context || context.provider !== provider) {
    return Response.json(
      { message: "Invalid or expired social authentication context" },
      { status: 400 },
    );
  }
  const credentials = await getClientSocialProviderCredentials(
    context.clientId,
    provider,
  );
  if (!credentials) {
    return Response.json(
      { message: "Social provider credentials are no longer available" },
      { status: 400 },
    );
  }
  const response = await runWithApplicationSocialProviderCredentials(
    provider,
    credentials,
    () => auth.handler(request),
  );
  response.headers.append(
    "set-cookie",
    clearSocialProviderContextCookie(provider),
  );
  return response;
}

const shouldLogRequests = env.NODE_ENV === "development";
const port = env.PORT;
const docsPlugin =
  env.NODE_ENV === "development"
    ? openapi({
        path: "/docs",
      })
    : new Elysia({ name: "openapi-disabled" });

await connectRedis();
console.log("Redis is ready");
startVisitorFlushWorker();
startApplicationRevocationWorker();

const server = new Elysia()
  .use(securityHeadersPlugin({ production: env.NODE_ENV === "production" }))
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .use(docsPlugin)
  .onRequest(({ request }) => {
    if (!shouldLogRequests) {
      return;
    }

    const { pathname } = new URL(request.url);
    console.log(`[Server] ${request.method} ${pathname}`);
  })
  .onBeforeHandle((context) => {
    return enforceRateLimit(context as any);
  })
  .use(oauthTokenController)
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      const requestId = randomUUID();
      const response = await handleBetterAuthRequest(request);
      const observedFailure = await observeBetterAuthFailure({
        request,
        response,
        requestId,
      });
      if (observedFailure) {
        response.headers.set("x-request-id", requestId);
      }
      if (new URL(request.url).pathname === "/api/auth/jwks" && response.ok) {
        response.headers.set("cache-control", "public, max-age=300, stale-while-revalidate=300");
      }
      return response;
    }
    return status(405);
  }, {
    parse: "none",
  })
  .use(app)
  .get("/", () => "OK")
  .listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

export type App = typeof server;
