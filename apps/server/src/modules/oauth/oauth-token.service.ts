import { randomBytes, randomUUID } from "node:crypto";
import {
  auth,
  hashOAuthToken,
  isValidPkceVerifier,
  securelyMatchesChallenge,
} from "@sso/auth/server";
import prisma from "@sso/db/server";
import { env } from "@sso/env/server";
import { getAvailableApplicationAuthMethodIds } from "@sso/auth/server";
import { z } from "zod";
import { recordApplicationUsage } from "../application-usage/application-usage.service";
import {
  getApplicationClientAccess,
  registerApplicationMemberIfAllowed,
} from "@sso/db/server";

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

const embeddedMagicLinkSchema = z.object({
  type: z.literal("embedded_magic_link"),
  clientId: z.string().min(1),
  redirectUri: z.url(),
  origin: z.url(),
  state: z.string().min(20),
  nonce: z.string().min(20),
  codeChallenge: z.string().regex(challengePattern),
});

type ConsumedCodeRow = {
  value: string;
  expiresAt: Date;
};

type TokenExchangeResult = {
  access_token: string;
  id_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: "openid";
};

const activeCodeExchanges = new Map<string, Promise<TokenExchangeResult>>();

export type PublicAuthMethod =
  | "magic_link"
  | "password"
  | "google"
  | "facebook"
  | "linkedin"
  | "github";

export type PublicClientMetadata = {
  client_id: string;
  application_id: string;
  application_logo_url: string | null;
  audience: string;
  issuer: string;
  sign_in_methods: PublicAuthMethod[];
  sign_up_methods: PublicAuthMethod[];
  registration_mode: "closed" | "invite_only" | "open";
  password_email_verification_required: boolean;
};

export type TokenExchangeInput = {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  origin?: string;
  requestId: string;
  request?: Request;
};

export type EmbeddedAuthorizationInput = {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  origin: string;
  userId: string;
  sessionId: string;
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
  applicationClientId?: string;
  clientId?: string;
  request?: Request;
}) {
  try {
    const resolvedClient =
      !input.applicationId && input.clientId
        ? await prisma.applicationClient.findUnique({
            where: { clientId: input.clientId },
            select: { id: true, applicationId: true },
          })
        : null;
    await recordApplicationUsage({
      type: "token",
      outcome: input.type === "oauth.token.denied" ? "denied" : "success",
      userId: input.userId,
      applicationId: input.applicationId ?? resolvedClient?.applicationId,
      applicationClientId:
        input.applicationClientId ?? resolvedClient?.id,
      requestId: input.requestId,
      reason: input.reason,
      request: input.request,
      metadata: { clientId: input.clientId },
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
  request?: Request;
}) {
  await recordTokenEvent({
    type: "oauth.token.denied",
    requestId: input.requestId,
    reason: input.reason,
    clientId: input.clientId,
    request: input.request,
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

export async function validateEmbeddedAuthorizationRequest(input: {
  clientId: string;
  redirectUri: string;
  origin: string;
  method: PublicAuthMethod;
  intent: "signin" | "signup";
}) {
  const client = await prisma.applicationClient.findFirst({
    where: {
      clientId: input.clientId,
      public: true,
      status: "active",
      oauthDisabled: false,
      redirectUris: { has: input.redirectUri },
      allowedOrigins: { has: input.origin },
      application: { status: "active" },
    },
    select: {
      id: true,
      applicationId: true,
      application: {
        select: {
          signInMethods: true,
          signUpMethods: true,
          registrationMode: true,
          passwordEmailVerificationRequired: true,
        },
      },
    },
  });
  const methods = input.intent === "signup"
    ? client?.application.signUpMethods
    : client?.application.signInMethods;
  if (
    !client ||
    !methods?.includes(input.method) ||
    (input.intent === "signup" && client.application.registrationMode === "closed")
  ) {
    throw new OAuthTokenError("invalid_client", 403, "embedded_auth_not_allowed");
  }
  return client;
}

export async function issueEmbeddedAuthorizationCode(
  input: EmbeddedAuthorizationInput,
) {
  let access = await getApplicationClientAccess(input.userId, input.clientId);
  if (access.allowed === false && access.reason === "membership_missing") {
    if (await registerApplicationMemberIfAllowed(input.userId, input.clientId)) {
      access = await getApplicationClientAccess(input.userId, input.clientId);
    }
  }
  if (!access.allowed) {
    throw new OAuthTokenError("invalid_grant", 403, access.reason);
  }
  if (!challengePattern.test(input.codeChallenge)) {
    throw new OAuthTokenError("invalid_request", 400, "invalid_code_challenge");
  }
  const code = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier: hashOAuthToken(code),
      value: JSON.stringify({
        type: "authorization_code",
        userId: input.userId,
        sessionId: input.sessionId,
        query: {
          client_id: input.clientId,
          redirect_uri: input.redirectUri,
          response_type: "code",
          scope: "openid",
          code_challenge_method: "S256",
          code_challenge: input.codeChallenge,
          nonce: input.nonce,
        },
      }),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_SECONDS * 1_000),
      createdAt: now,
      updatedAt: now,
    },
  });
  const redirect = new URL(input.redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", input.state);
  redirect.searchParams.set("iss", env.SSO_ISSUER);
  return redirect.toString();
}

export async function createEmbeddedMagicLinkTransaction(
  input: Omit<EmbeddedAuthorizationInput, "userId" | "sessionId">,
) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      identifier: hashOAuthToken(token),
      value: JSON.stringify({ type: "embedded_magic_link", ...input }),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_SECONDS * 1_000),
      createdAt: now,
      updatedAt: now,
    },
  });
  return token;
}

export async function consumeEmbeddedMagicLinkTransaction(token: string) {
  const rows = await prisma.$queryRaw<ConsumedCodeRow[]>`
    DELETE FROM "verification"
    WHERE "identifier" = ${hashOAuthToken(token)}
    RETURNING "value", "expiresAt"
  `;
  const row = rows[0];
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    throw new OAuthTokenError("invalid_grant", 400, "magic_link_transaction_invalid");
  }
  let value: unknown;
  try {
    value = JSON.parse(row.value);
  } catch {
    throw new OAuthTokenError("invalid_grant", 400, "magic_link_transaction_invalid");
  }
  const parsed = embeddedMagicLinkSchema.safeParse(value);
  if (!parsed.success) {
    throw new OAuthTokenError("invalid_grant", 400, "magic_link_transaction_invalid");
  }
  return parsed.data;
}

export async function getPublicClientMetadata(
  clientId: string,
): Promise<PublicClientMetadata | null> {
  const client = await prisma.applicationClient.findFirst({
    where: { clientId, public: true },
    select: {
      clientId: true,
      applicationId: true,
      status: true,
      oauthDisabled: true,
      application: {
        select: {
          status: true,
          logoUrl: true,
          signInMethods: true,
          signUpMethods: true,
          registrationMode: true,
          passwordEmailVerificationRequired: true,
          oauthProviderConnections: {
            select: {
              provider: true,
              oauthProviderConnection: {
                select: { name: true, status: true },
              },
            },
          },
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
    client.application.oauthProviderConnections.map((assignment) => ({
      provider: assignment.provider,
      name: assignment.oauthProviderConnection.name,
      status: assignment.oauthProviderConnection.status,
    })),
  );

  return {
    client_id: client.clientId,
    application_id: client.applicationId,
    application_logo_url: client.application.logoUrl,
    audience: `urn:sso:application:${client.applicationId}`,
    issuer: env.SSO_ISSUER,
    sign_in_methods: available
      ? client.application.signInMethods.filter((method) =>
          availableMethodIds.has(method),
        ) as PublicAuthMethod[]
      : [],
    sign_up_methods:
      available && client.application.registrationMode !== "closed"
        ? client.application.signUpMethods.filter((method) =>
            availableMethodIds.has(method),
          ) as PublicAuthMethod[]
        : [],
    registration_mode: client.application.registrationMode as PublicClientMetadata["registration_mode"],
    password_email_verification_required:
      client.application.passwordEmailVerificationRequired,
  };
}

export function exchangeAuthorizationCode(input: TokenExchangeInput) {
  const exchangeKey = hashOAuthToken([
    input.code,
    input.clientId,
    input.redirectUri,
    input.codeVerifier,
    input.origin ?? "",
  ].join("\0"));
  const active = activeCodeExchanges.get(exchangeKey);
  if (active) return active;

  const exchange = performAuthorizationCodeExchange(input);
  activeCodeExchanges.set(exchangeKey, exchange);
  void exchange.finally(() => {
    if (activeCodeExchanges.get(exchangeKey) === exchange) {
      activeCodeExchanges.delete(exchangeKey);
    }
  }).catch(() => undefined);
  return exchange;
}

async function performAuthorizationCodeExchange(
  input: TokenExchangeInput,
): Promise<TokenExchangeResult> {
  let audit: {
    userId?: string;
    applicationId?: string;
    applicationClientId?: string;
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
        id: true,
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
                    name: true,
                    email: true,
                    image: true,
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
    audit.applicationClientId = client.id;

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
            name: member.user.name,
            email: member.user.email,
            email_verified: member.user.emailVerified,
            picture: member.user.image,
          },
        },
      }),
    ]);

    await recordTokenEvent({
      type: "oauth.token.succeeded",
      requestId: input.requestId,
      reason: "authorization_code_exchanged",
      ...audit,
      request: input.request,
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
      request: input.request,
    });
    throw oauthError;
  }
}
