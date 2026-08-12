import { cors } from "@elysiajs/cors";
import { auth } from "@sso/auth/server";
import { env } from "@sso/env/server";
import prisma from "@sso/db/server";
import { connectRedis } from "@sso/redis/server";
import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import { app } from "./modules/app";
import { openapi } from "@elysiajs/openapi";
import { enforceRateLimit } from "./modules/rate-limit/rate-limit.service";
import { startApplicationUsageRetentionWorker } from "./modules/application-usage/application-usage.service";
import { securityHeadersPlugin } from "./plugins/security-headers";
import { oauthTokenController } from "./modules/oauth/oauth-token.controller";
import { startApplicationRevocationWorker } from "./modules/application-revocation/revocation.service";
import { observeBetterAuthFailure } from "./modules/auth/auth-observability.service";
import {
  runWithOAuthProviderConnection,
  type ApplicationSocialProviderId,
} from "@sso/auth/server";
import {
  consumeSocialProviderContext,
  getOAuthProviderConnectionForCallback,
} from "./modules/auth/social-provider-credentials.service";
import { recordApplicationUsage } from "./modules/application-usage/application-usage.service";

async function handleBetterAuthRequest(request: Request) {
  const match = new URL(request.url).pathname.match(
    /^\/api\/auth\/callback\/(google|facebook|github|linkedin)\/?$/,
  );
  if (!match) return auth.handler(request);
  const provider = match[1] as ApplicationSocialProviderId;
  const state = new URL(request.url).searchParams.get("state");
  const context = state ? await consumeSocialProviderContext(state) : null;
  if (!context || context.provider !== provider) {
    if (context) {
      await recordApplicationUsage({
        type: "social_callback",
        outcome: "denied",
        applicationId: context.applicationId,
        applicationClientId: context.applicationClientId,
        oauthProviderConnectionId: context.oauthProviderConnectionId,
        authMethod: context.provider,
        requestId: context.requestId,
        reason: "provider_context_mismatch",
        request,
      });
    }
    return Response.json(
      { message: "Invalid or expired social authentication context" },
      { status: 400 },
    );
  }
  const connection = await getOAuthProviderConnectionForCallback(context);
  if (!connection) {
    await recordApplicationUsage({
      type: "social_callback",
      outcome: "denied",
      applicationId: context.applicationId,
      applicationClientId: context.applicationClientId,
      oauthProviderConnectionId: context.oauthProviderConnectionId,
      authMethod: context.provider,
      requestId: context.requestId,
      reason: "connection_changed_or_unavailable",
      request,
    });
    return Response.json(
      {
        message:
          "OAuth connection changed or is no longer available; start sign-in again",
      },
      { status: 400 },
    );
  }
  const response = await runWithOAuthProviderConnection(
    connection,
    () => auth.handler(request),
  );
  await recordApplicationUsage({
    type: "social_callback",
    outcome: response.ok || response.status === 302 ? "success" : "denied",
    applicationId: context.applicationId,
    applicationClientId: context.applicationClientId,
    oauthProviderConnectionId: context.oauthProviderConnectionId,
    authMethod: context.provider,
    requestId: context.requestId,
    reason:
      response.ok || response.status === 302
        ? "provider_callback_completed"
        : "provider_callback_rejected",
    request,
  });
  return response;
}

async function handleGlobalSignOut(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const returnToValue = url.searchParams.get("return_to");
  if (!clientId || !returnToValue) {
    return Response.json({ message: "Invalid global logout request" }, { status: 400 });
  }

  let returnTo: URL;
  try {
    returnTo = new URL(returnToValue);
  } catch {
    return Response.json({ message: "Invalid logout return URL" }, { status: 400 });
  }

  const client = await prisma.applicationClient.findFirst({
    where: {
      clientId,
      status: "active",
      oauthDisabled: false,
      application: { status: "active" },
    },
    select: { allowedOrigins: true, redirectUris: true },
  });
  const registeredReturnOrigin = client && (
    client.allowedOrigins.includes(returnTo.origin) ||
    client.redirectUris.some((redirectUri) => {
      try {
        return new URL(redirectUri).origin === returnTo.origin;
      } catch {
        return false;
      }
    })
  );
  if (!registeredReturnOrigin) {
    return Response.json({ message: "Logout return URL is not registered" }, { status: 403 });
  }

  const signOutResponse = await auth.api.signOut({
    headers: request.headers,
    asResponse: true,
  });
  const headers = new Headers({
    location: returnTo.toString(),
    "cache-control": "no-store",
  });
  for (const cookie of signOutResponse.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }
  return new Response(null, { status: 303, headers });
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
startApplicationUsageRetentionWorker();
startApplicationRevocationWorker();

const server = new Elysia()
  .use(securityHeadersPlugin({ production: env.NODE_ENV === "production" }))
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      // Dedicated OAuth and embedded-auth controllers validate public client
      // origins. Keep the global plugin from swallowing their OPTIONS routes.
      preflight: false,
    }),
  )
  .options("/*", () => new Response(null, { status: 204 }))
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
  .get("/api/auth/global-sign-out", ({ request }) => handleGlobalSignOut(request))
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      const requestId = randomUUID();
      const pathname = new URL(request.url).pathname;
      const sessionBeforeLogout =
        pathname === "/api/auth/sign-out"
          ? await auth.api.getSession({ headers: request.headers })
          : null;
      const response = await handleBetterAuthRequest(request);
      const observedFailure = await observeBetterAuthFailure({
        request,
        response,
        requestId,
      });
      if (observedFailure) {
        response.headers.set("x-request-id", requestId);
      }
      if (pathname === "/api/auth/sign-out" && response.ok) {
        await recordApplicationUsage({
          type: "logout",
          outcome: "success",
          userId: sessionBeforeLogout?.user.id,
          requestId,
          reason: "session_ended",
          request,
        });
      }
      if (pathname === "/api/auth/jwks" && response.ok) {
        response.headers.set("cache-control", "public, max-age=300, stale-while-revalidate=300");
        response.headers.set("access-control-allow-origin", "*");
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
