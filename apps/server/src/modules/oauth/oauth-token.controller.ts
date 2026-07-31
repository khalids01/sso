import { randomUUID } from "node:crypto";
import { Elysia, t } from "elysia";
import { env } from "@sso/env/server";
import {
  exchangeAuthorizationCode,
  getPublicClientMetadata,
  isOriginRegisteredForActiveClient,
  OAuthTokenError,
  recordTokenRequestDenied,
} from "./oauth-token.service";

const TOKEN_PATH = "/api/auth/oauth2/token";
const CLIENT_METADATA_PATH = "/api/oauth/client-metadata";
const AuthMethodDto = t.Union([
  t.Literal("magic_link"),
  t.Literal("password"),
  t.Literal("google"),
  t.Literal("facebook"),
  t.Literal("linkedin"),
  t.Literal("github"),
]);
const PublicClientMetadataDto = t.Object({
  client_id: t.String(),
  application_id: t.String(),
  application_logo_url: t.Union([t.String(), t.Null()]),
  audience: t.String(),
  issuer: t.String(),
  sign_in_methods: t.Array(AuthMethodDto),
  sign_up_methods: t.Array(AuthMethodDto),
  registration_mode: t.Union([
    t.Literal("closed"),
    t.Literal("invite_only"),
    t.Literal("open"),
  ]),
  password_email_verification_required: t.Boolean(),
});
const tokenFields = [
  "grant_type",
  "client_id",
  "code",
  "redirect_uri",
  "code_verifier",
] as const;

function normalizeOrigin(value: string | null) {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function corsHeaders(origin?: string) {
  if (!origin) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "access-control-max-age": "300",
    "access-control-allow-credentials": "false",
    vary: "Origin",
  };
}

function tokenHeaders(origin?: string) {
  return {
    "cache-control": "no-store",
    pragma: "no-cache",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...corsHeaders(origin),
  };
}

function errorResponse(error: OAuthTokenError, requestId: string, origin?: string) {
  return new Response(JSON.stringify({ error: error.code }), {
    status: error.status,
    headers: { ...tokenHeaders(origin), "x-request-id": requestId },
  });
}

function readSingle(params: URLSearchParams, key: string) {
  const values = params.getAll(key);
  if (values.length !== 1 || !values[0]) {
    throw new OAuthTokenError("invalid_request", 400, `invalid_${key}`);
  }
  return values[0];
}

export const oauthTokenController = new Elysia({ name: "oauth-token" })
  .get(CLIENT_METADATA_PATH, async ({ query, set, status }) => {
    const clientId = query.client_id;
    const metadata = await getPublicClientMetadata(clientId);
    if (!metadata) {
      return status(404, { error: "client_not_found" });
    }
    set.headers["cache-control"] = "public, max-age=300";
    set.headers["x-content-type-options"] = "nosniff";
    return metadata;
  }, {
    query: t.Object({ client_id: t.String({ minLength: 1 }) }),
    response: {
      200: PublicClientMetadataDto,
      404: t.Object({ error: t.Literal("client_not_found") }),
    },
  })
  .options(TOKEN_PATH, async ({ request }) => {
    if (!env.ENABLE_OAUTH_TOKEN_ISSUANCE) {
      return new Response("Not Found", { status: 404 });
    }
    const origin = normalizeOrigin(request.headers.get("origin"));
    if (!origin || !(await isOriginRegisteredForActiveClient(origin))) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  })
  .post(
    TOKEN_PATH,
    async ({ request }) => {
      if (!env.ENABLE_OAUTH_TOKEN_ISSUANCE) {
        return new Response("Not Found", { status: 404 });
      }
      const requestId = randomUUID();
      const originHeader = request.headers.get("origin");
      const origin = normalizeOrigin(originHeader);
      let exchangeStarted = false;
      let clientId: string | undefined;
      try {
        if (originHeader && !origin) {
          throw new OAuthTokenError("invalid_client", 400, "invalid_origin");
        }
        const contentType = request.headers.get("content-type")?.split(";", 1)[0];
        if (contentType !== "application/x-www-form-urlencoded") {
          throw new OAuthTokenError("invalid_request", 400, "invalid_content_type");
        }
        if (request.headers.has("authorization")) {
          throw new OAuthTokenError("invalid_client", 400, "client_auth_not_supported");
        }

        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 4_096) {
          throw new OAuthTokenError("invalid_request", 400, "request_too_large");
        }
        const requestBody = await request.text();
        if (requestBody.length > 4_096) {
          throw new OAuthTokenError("invalid_request", 400, "request_too_large");
        }
        const params = new URLSearchParams(requestBody);
        for (const key of params.keys()) {
          if (!tokenFields.includes(key as (typeof tokenFields)[number])) {
            throw new OAuthTokenError("invalid_request", 400, "unsupported_parameter");
          }
        }
        if (readSingle(params, "grant_type") !== "authorization_code") {
          throw new OAuthTokenError("unsupported_grant_type", 400);
        }

        clientId = readSingle(params, "client_id");
        exchangeStarted = true;
        const result = await exchangeAuthorizationCode({
          clientId,
          code: readSingle(params, "code"),
          redirectUri: readSingle(params, "redirect_uri"),
          codeVerifier: readSingle(params, "code_verifier"),
          origin,
          requestId,
          request,
        });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...tokenHeaders(origin), "x-request-id": requestId },
        });
      } catch (error) {
        const oauthError =
          error instanceof OAuthTokenError
            ? error
            : new OAuthTokenError("server_error", 500);
        if (!exchangeStarted) {
          await recordTokenRequestDenied({
            requestId,
            reason: oauthError.auditReason,
            clientId,
            request,
          });
        }
        return errorResponse(oauthError, requestId, origin);
      }
    },
    { parse: "none" },
  );
