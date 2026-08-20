import { auth } from "@sso/auth/server";
import prisma from "@sso/db/server";
import { enqueueUserWebhookDeliveries, toWebhookUser } from "@sso/db/server/user-webhooks";
import {
  listUserSessionDevices,
  revokeUserSessionDevice,
  revokeUserSessionsExcept,
} from "../../../../../packages/db/src/session-revocation.server";
import { env } from "@sso/env/server";

const socialProviders = new Set(["google", "facebook", "linkedin", "github"]);

export class ProfileAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 409 = 400,
  ) {
    super(message);
    this.name = "ProfileAccessError";
  }
}

type AccessContext = {
  userId: string;
  sessionId: string;
  clientId: string;
  applicationId: string;
  origin: string | null;
};

export async function authenticateProfileRequest(request: Request): Promise<AccessContext> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ProfileAccessError("Authentication required", 401);

  const verified = await auth.api.verifyJWT({
    body: { token, issuer: env.SSO_ISSUER },
  });
  const payload = verified.payload;
  const clientId = typeof payload?.azp === "string" ? payload.azp : null;
  const applicationId = typeof payload?.application_id === "string"
    ? payload.application_id
    : null;
  const membershipId = typeof payload?.membership_id === "string"
    ? payload.membership_id
    : null;
  const sessionId = typeof payload?.sid === "string" ? payload.sid : null;
  const authorizationVersion = typeof payload?.authorization_version === "number"
    ? payload.authorization_version
    : null;
  if (!payload?.sub || !clientId || !applicationId || !membershipId || !sessionId) {
    throw new ProfileAccessError("Invalid profile access token", 401);
  }
  const expectedAudience = `urn:sso:application:${applicationId}`;
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new ProfileAccessError("Invalid profile token audience", 401);
  }

  const client = await prisma.applicationClient.findFirst({
    where: {
      clientId,
      applicationId,
      status: "active",
      oauthDisabled: false,
      application: { status: "active" },
    },
    select: {
      allowedOrigins: true,
      application: {
        select: {
          subjects: {
            where: { subject: payload.sub },
            take: 1,
            select: { userId: true },
          },
          members: {
            where: { id: membershipId, status: "active" },
            take: 1,
            select: { userId: true, authorizationVersion: true },
          },
        },
      },
    },
  });
  const subject = client?.application.subjects[0];
  const member = client?.application.members[0];
  if (
    !client ||
    !subject ||
    !member ||
    subject.userId !== member.userId ||
    member.authorizationVersion !== authorizationVersion
  ) {
    throw new ProfileAccessError("Application access is no longer active", 403);
  }
  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      userId: member.userId,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!session) throw new ProfileAccessError("Session is no longer active", 401);

  const originHeader = request.headers.get("origin");
  let origin: string | null = null;
  if (originHeader) {
    try {
      origin = new URL(originHeader).origin;
    } catch {
      throw new ProfileAccessError("Invalid request origin", 403);
    }
    if (!client.allowedOrigins.includes(origin)) {
      throw new ProfileAccessError("Request origin is not registered", 403);
    }
  }

  return { userId: member.userId, sessionId, clientId, applicationId, origin };
}

export async function getUserProfile(context: AccessContext) {
  const [user, application, accounts, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      },
    }),
    prisma.application.findUnique({
      where: { id: context.applicationId },
      select: {
        signInMethods: true,
        emailProviderConnections: {
          where: { emailProviderConnection: { status: "active" } },
          take: 1,
          select: { role: true },
        },
      },
    }),
    prisma.account.findMany({
      where: { userId: context.userId },
      select: { id: true, providerId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    listUserSessionDevices(context.userId, context.sessionId),
  ]);
  if (!user || !application) throw new ProfileAccessError("Profile not found", 404);

  const visibleAccounts = accounts
    .filter((account) => account.providerId === "credential" || socialProviders.has(account.providerId))
    .map((account) => ({
      id: account.id,
      provider: account.providerId === "credential" ? "password" : account.providerId,
      createdAt: account.createdAt.toISOString(),
    }));

  return {
    user,
    capabilities: {
      email: application.emailProviderConnections.length > 0,
      password: application.signInMethods.includes("password"),
      passwordSet: visibleAccounts.some((account) => account.provider === "password"),
    },
    accounts: visibleAccounts,
    sessions: sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isCurrent: session.isCurrent,
    })),
  };
}

export async function runProfileAction(
  context: AccessContext,
  action:
    | { action: "update_name"; name: string }
    | { action: "resend_verification" }
    | { action: "revoke_session"; sessionId: string }
    | { action: "revoke_other_sessions" }
    | { action: "unlink_account"; accountId: string },
) {
  if (action.action === "update_name") {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: context.userId }, data: { name: action.name.trim() },
        select: { id: true, name: true, email: true, emailVerified: true, image: true, banned: true, archived: true },
      });
      await enqueueUserWebhookDeliveries(tx, { eventType: "user.updated", user: toWebhookUser(user) });
    });
  } else if (action.action === "resend_verification") {
    const profile = await getUserProfile(context);
    if (!profile.capabilities.email) {
      throw new ProfileAccessError("Connect a mail provider to use email features", 409);
    }
    if (!profile.user.emailVerified) {
      const callbackURL = new URL("/", context.origin ?? env.CORS_ORIGIN);
      callbackURL.searchParams.set("client_id", context.clientId);
      await auth.api.sendVerificationEmail({
        body: { email: profile.user.email, callbackURL: callbackURL.toString() },
      });
    }
  } else if (action.action === "revoke_session") {
    await revokeUserSessionDevice(context.userId, action.sessionId, context.sessionId);
  } else if (action.action === "revoke_other_sessions") {
    await revokeUserSessionsExcept(context.userId, context.sessionId);
  } else {
    const accounts = await prisma.account.findMany({
      where: { userId: context.userId },
      select: { id: true, providerId: true },
    });
    const target = accounts.find((account) => account.id === action.accountId);
    if (!target || !socialProviders.has(target.providerId)) {
      throw new ProfileAccessError("Connected account not found", 404);
    }
    if (accounts.length <= 1) {
      throw new ProfileAccessError("The last sign-in method cannot be disconnected");
    }
    await prisma.account.delete({ where: { id: target.id } });
  }
  return getUserProfile(context);
}
