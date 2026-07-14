import {
  getApplicationClientAccess,
  recordApplicationAuthorizationDenied,
} from "../../../db/src/application-access.server";
import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";

const pkceS256ChallengePattern = /^[A-Za-z0-9_-]{43}$/;

type AuthorizationQuery = Record<string, unknown>;

export function validateAuthorizationQuery(query: AuthorizationQuery) {
  if (typeof query.state !== "string" || !query.state.trim()) {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_request",
      error_description: "state is required",
    });
  }

  if (query.scope !== "openid") {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_scope",
      error_description: "scope must be openid",
    });
  }

  if (query.prompt !== undefined) {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_request",
      error_description: "prompt is not supported",
    });
  }

  if (
    query.code_challenge_method !== "S256" ||
    typeof query.code_challenge !== "string" ||
    !pkceS256ChallengePattern.test(query.code_challenge)
  ) {
    throw new APIError("BAD_REQUEST", {
      error: "invalid_request",
      error_description: "valid S256 PKCE challenge is required",
    });
  }
}

function isAccessGrantAttempt(ctx: { path?: string; body?: unknown }) {
  const body = ctx.body as
    | { accept?: unknown; postLogin?: unknown }
    | undefined;

  return (
    (ctx.path === "/oauth2/continue" && body?.postLogin === true) ||
    (ctx.path === "/oauth2/consent" && body?.accept === true)
  );
}

export function applicationAuthorizationGuard(): BetterAuthPlugin {
  return {
    id: "application-authorization-guard",
    hooks: {
      before: [
        {
          matcher(ctx) {
            return ctx.path === "/oauth2/authorize";
          },
          handler: createAuthMiddleware(async (ctx) => {
            validateAuthorizationQuery(ctx.query as AuthorizationQuery);
          }),
        },
        {
          matcher(ctx) {
            return isAccessGrantAttempt(ctx);
          },
          handler: createAuthMiddleware(async (ctx) => {
            const oauthQuery = (ctx.body as { oauth_query?: unknown } | undefined)
              ?.oauth_query;
            if (typeof oauthQuery !== "string") {
              throw new APIError("BAD_REQUEST", {
                error: "invalid_request",
                error_description: "oauth_query is required",
              });
            }

            const clientId = new URLSearchParams(oauthQuery).get("client_id");
            if (!clientId) {
              throw new APIError("BAD_REQUEST", {
                error: "invalid_client",
                error_description: "client_id is required",
              });
            }

            const session = await getSessionFromCtx(ctx);
            if (!session) {
              throw new APIError("UNAUTHORIZED", {
                error: "login_required",
                error_description: "Authentication required",
              });
            }

            const result = await getApplicationClientAccess(
              session.user.id,
              clientId,
            );

            if (result.allowed) {
              return;
            }

            await recordApplicationAuthorizationDenied({
              userId: session.user.id,
              result,
            });

            throw new APIError("FORBIDDEN", {
              error: "access_denied",
              error_description: "Application access denied",
            });
          }),
        },
      ],
    },
  };
}
