import { randomUUID } from "node:crypto";
import {
  auth,
  hashOAuthToken,
  isValidPkceVerifier,
  securelyMatchesChallenge,
} from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import { getAvailableApplicationAuthMethodIds } from "@auth/server";
import { z } from "zod";

const TOKEN_TTL_SECONDS = 10 * 60;
const challengePattern = /^[A-Za-z0-9_-]{43}$/;

const storedCodeSchema = z.object({
  type: z.literal("authorization_code"),
  userId: z.string().min(1),
  sessionId: z.string().min(1),
  query: z.object({
    client_id: z.string().min(1),
    redirect_uri: z.url(),
    response_type: z.literal("code"),
    scope: z.literal("openid"),
    code_challenge_method: z.literal("S256"),
    code_challenge: z.string().regex(challengePattern),
    nonce: z.string().optional(),
  }),
});

type ConsumedCodeRow = {
  value: string;
  expiresAt: Date;
};

export type TokenExchangeInput = {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  origin?: string;
  requestId: string;
};

export class OAuthTokenError extends Error {
  constructor(
    public readonly code:
      | "invalid_request"
      | "invalid_client"
      | "invalid_grant"
      | "unsupported_grant_type"
      | "server_error",
    public readonly status = 400,
    public readonly auditReason: string = code,
  ) {
    super(code);
    this.name = "OAuthTokenError";
  }
}

async function consumeAuthorizationCode(code: string) {
  const identifier = hashOAuthToken(code);
  const rows = await prisma.$queryRaw<ConsumedCodeRow[]>`
    DELETE FROM "verification"
    WHERE "identifier" = ${identifier}
    RETURNING "value", "expiresAt"
  `;
  return rows[0] ?? null;
}

async function recordTokenEvent(input: {
  type: "oauth.token.succeeded" | "oauth.token.denied";
  requestId: string;
  reason: string;
  userId?: string;
  applicationId?: string;
  clientId?: string;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        type: input.type,
        actorUserId: input.userId,
        severity: input.type === "oauth.token.denied" ? "warning" : "info",
        message:
          input.type === "oauth.token.denied"
            ? "OAuth token exchange denied"
            : "OAuth token issued",
        metadata: {
          requestId: input.requestId,
          reason: input.reason,
          applicationId: input.applicationId,
          clientId: input.clientId,
        },
      },
    });
  } catch (error) {
    console.error("OAuth token activity recording failed", {
      requestId: input.requestId,
      error: error instanceof Error ? error.name : "unknown_error",
    });
  }
}

export async function recordTokenRequestDenied(input: {
  requestId: string;
  reason: string;
  clientId?: string;
}) {
  await recordTokenEvent({
    type: "oauth.token.denied",
    requestId: input.requestId,
    reason: input.reason,
    clientId: input.clientId,
  });
}

export async function isOriginRegisteredForActiveClient(origin: string) {
  const client = await prisma.applicationClient.findFirst({
    where: {
      status: "active",
      oauthDisabled: false,
      public: true,
      tokenEndpointAuthMethod: "none",
      grantTypes: { has: "authorization_code" },
      allowedOrigins: { has: origin },
      application: { status: "active" },
    },
    select: { id: true },
  });
  return Boolean(client);
}

export async function getPublicClientMetadata(clientId: string) {
  const client = await prisma.applicationClient.findFirst({
    where: { clientId, public: true },
    select: {
      clientId: true,
      applicationId: true,
      status: true,
      oauthDisabled: true,
      socialProviderCredentials: { select: { provider: true } },
      application: {
        select: {
          status: true,
          signInMethods: true,
          signUpMethods: true,
          registrationMode: true,
          passwordEmailVerificationRequired: true,
        },
      },
    },
  });
  if (!client) return null;

  const available =
    client.status === "active" &&
    !client.oauthDisabled &&
    client.application.status === "active";
  const availableMethodIds = getAvailableApplicationAuthMethodIds(
    client.socialProviderCredentials.map((credential) => credential.provider),
  );

  return {
    client_id: client.clientId,
    application_id: client.applicationId,
    audience: `urn:sso:application:${client.applicationId}`,
    issuer: env.SSO_ISSUER,
    sign_in_methods: available
      ? client.application.signInMethods.filter((method) =>
          availableMethodIds.has(method),
        )
      : [],
    sign_up_methods:
      available && client.application.registrationMode !== "closed"
        ? client.application.signUpMethods.filter((method) =>
            availableMethodIds.has(method),
          )
        : [],
    registration_mode: client.application.registrationMode,
    password_email_verification_required:
      client.application.passwordEmailVerificationRequired,
  };
}

export async function exchangeAuthorizationCode(input: TokenExchangeInput) {
  let audit: {
    userId?: string;
    applicationId?: string;
    clientId?: string;
  } = { clientId: input.clientId };

  try {
    const consumed = await consumeAuthorizationCode(input.code);
    if (!consumed) {
      throw new OAuthTokenError("invalid_grant", 400, "code_not_found_or_reused");
    }
    if (consumed.expiresAt.getTime() <= Date.now()) {
      throw new OAuthTokenError("invalid_grant", 400, "code_expired");
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(consumed.value);
    } catch {
      throw new OAuthTokenError("invalid_grant", 400, "code_payload_invalid");
    }
    const parsed = storedCodeSchema.safeParse(decoded);
    if (!parsed.success) {
      throw new OAuthTokenError("invalid_grant", 400, "code_payload_invalid");
    }
    const stored = parsed.data;
    audit.userId = stored.userId;

    if (
      stored.query.client_id !== input.clientId ||
      stored.query.redirect_uri !== input.redirectUri
    ) {
      throw new OAuthTokenError("invalid_grant", 400, "code_binding_mismatch");
    }
    if (
      !isValidPkceVerifier(input.codeVerifier) ||
      !securelyMatchesChallenge(
        input.codeVerifier,
        stored.query.code_challenge,
      )
    ) {
      throw new OAuthTokenError("invalid_grant", 400, "pkce_verification_failed");
    }

    const client = await prisma.applicationClient.findUnique({
      where: { clientId: input.clientId },
      select: {
        clientId: true,
        clientType: true,
        status: true,
        oauthDisabled: true,
        public: true,
        tokenEndpointAuthMethod: true,
        grantTypes: true,
        responseTypes: true,
        scopes: true,
        redirectUris: true,
        allowedOrigins: true,
        application: {
          select: {
            id: true,
            status: true,
            passwordEmailVerificationRequired: true,
            members: {
              where: { userId: stored.userId },
              take: 1,
              select: {
                id: true,
                status: true,
                authorizationVersion: true,
                user: {
                  select: {
                    id: true,
                    archived: true,
                    banned: true,
                    emailVerified: true,
                  },
                },
              },
            },
            subjects: {
              where: { userId: stored.userId },
              take: 1,
              select: { subject: true },
            },
          },
        },
      },
    });

    if (!client) {
      throw new OAuthTokenError("invalid_client", 400, "client_not_found");
    }
    audit.applicationId = client.application.id;

    const clientValid =
      client.clientType === "public" &&
      client.public &&
      client.status === "active" &&
      !client.oauthDisabled &&
      client.tokenEndpointAuthMethod === "none" &&
      client.grantTypes.includes("authorization_code") &&
      client.responseTypes.includes("code") &&
      client.scopes.includes("openid") &&
      client.redirectUris.includes(input.redirectUri);
    if (!clientValid) {
      throw new OAuthTokenError("invalid_client", 400, "client_inactive_or_misconfigured");
    }
    if (input.origin && !client.allowedOrigins.includes(input.origin)) {
      throw new OAuthTokenError("invalid_client", 400, "origin_not_allowed");
    }
    if (client.application.status !== "active") {
      throw new OAuthTokenError("invalid_grant", 400, "application_inactive");
    }

    const member = client.application.members[0];
    const subject = client.application.subjects[0]?.subject;
    if (!member || member.status !== "active" || !subject) {
      throw new OAuthTokenError("invalid_grant", 400, "membership_inactive");
    }
    if (member.user.archived || member.user.banned) {
      throw new OAuthTokenError("invalid_grant", 400, "user_inactive");
    }
    if (
      client.application.passwordEmailVerificationRequired &&
      !member.user.emailVerified
    ) {
      throw new OAuthTokenError("invalid_grant", 400, "email_unverified");
    }

    const session = await prisma.session.findUnique({
      where: { id: stored.sessionId },
      select: { userId: true, createdAt: true, expiresAt: true },
    });
    if (
      !session ||
      session.userId !== stored.userId ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new OAuthTokenError("invalid_grant", 400, "session_inactive");
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + TOKEN_TTL_SECONDS;
    const audience = `urn:sso:application:${client.application.id}`;
    const [accessResult, idResult] = await Promise.all([
      auth.api.signJWT({
        body: {
          payload: {
            iss: env.SSO_ISSUER,
            sub: subject,
            aud: audience,
            azp: client.clientId,
            iat,
            exp,
            jti: randomUUID(),
            scope: "openid",
            application_id: client.application.id,
            membership_id: member.id,
            authorization_version: member.authorizationVersion,
          },
        },
      }),
      auth.api.signJWT({
        body: {
          payload: {
            iss: env.SSO_ISSUER,
            sub: subject,
            aud: client.clientId,
            iat,
            exp,
            auth_time: Math.floor(session.createdAt.getTime() / 1000),
            nonce: stored.query.nonce,
          },
        },
      }),
    ]);

    await recordTokenEvent({
      type: "oauth.token.succeeded",
      requestId: input.requestId,
      reason: "authorization_code_exchanged",
      ...audit,
    });

    return {
      access_token: accessResult.token,
      id_token: idResult.token,
      token_type: "Bearer" as const,
      expires_in: TOKEN_TTL_SECONDS,
      scope: "openid" as const,
    };
  } catch (error) {
    const oauthError =
      error instanceof OAuthTokenError
        ? error
        : new OAuthTokenError("server_error", 500, "unexpected_failure");
    await recordTokenEvent({
      type: "oauth.token.denied",
      requestId: input.requestId,
      reason: oauthError.auditReason,
      ...audit,
    });
    throw oauthError;
  }
}
