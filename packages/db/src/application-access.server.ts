import prisma from "./client.server";
import { randomBytes } from "node:crypto";

export type ApplicationClientAccessDenialReason =
  | "client_not_found"
  | "client_inactive"
  | "application_inactive"
  | "membership_missing"
  | "membership_inactive"
  | "email_unverified"
  | "user_inactive";

export type ApplicationClientAccessResult =
  | {
      allowed: true;
      applicationId: string;
      applicationName: string;
      clientId: string;
      clientName: string;
      memberId: string;
    }
  | {
      allowed: false;
      reason: ApplicationClientAccessDenialReason;
      applicationId?: string;
      applicationName?: string;
      clientId?: string;
      clientName?: string;
    };

export async function getApplicationClientAccess(
  userId: string,
  clientId: string,
  db: Pick<typeof prisma, "applicationClient"> = prisma,
): Promise<ApplicationClientAccessResult> {
  const client = await db.applicationClient.findUnique({
    where: { clientId },
    select: {
      clientId: true,
      name: true,
      status: true,
      oauthDisabled: true,
      application: {
        select: {
          id: true,
          name: true,
          status: true,
          passwordEmailVerificationRequired: true,
          members: {
            where: { userId },
            take: 1,
            select: {
              id: true,
              status: true,
              user: {
                select: {
                  archived: true,
                  banned: true,
                  emailVerified: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!client) {
    return { allowed: false, reason: "client_not_found" };
  }

  const context = {
    applicationId: client.application.id,
    applicationName: client.application.name,
    clientId: client.clientId,
    clientName: client.name,
  };

  if (client.status !== "active" || client.oauthDisabled) {
    return { allowed: false, reason: "client_inactive", ...context };
  }

  if (client.application.status !== "active") {
    return { allowed: false, reason: "application_inactive", ...context };
  }

  const member = client.application.members[0];
  if (!member) {
    return { allowed: false, reason: "membership_missing", ...context };
  }

  if (member.user.archived || member.user.banned) {
    return { allowed: false, reason: "user_inactive", ...context };
  }

  if (
    client.application.passwordEmailVerificationRequired &&
    !member.user.emailVerified
  ) {
    return { allowed: false, reason: "email_unverified", ...context };
  }

  if (member.status !== "active") {
    return { allowed: false, reason: "membership_inactive", ...context };
  }

  return {
    allowed: true,
    ...context,
    memberId: member.id,
  };
}

export async function registerApplicationMemberIfAllowed(
  userId: string,
  clientId: string,
  db: Pick<typeof prisma, "$transaction"> = prisma,
) {
  return db.$transaction(async (tx) => {
    const client = await tx.applicationClient.findUnique({
      where: { clientId },
      select: {
        application: {
          select: {
            id: true,
            status: true,
            registrationMode: true,
          },
        },
      },
    });
    if (!client || client.application.status !== "active") return false;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, archived: true, banned: true },
    });
    if (!user || user.archived || user.banned) return false;

    let invitationId: string | undefined;
    if (client.application.registrationMode === "invite_only") {
      const invitation = await tx.applicationInvitation.findFirst({
        where: {
          applicationId: client.application.id,
          email: user.email.trim().toLowerCase(),
          status: "pending",
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
        orderBy: { createdAt: "desc" },
      });
      if (!invitation) return false;
      invitationId = invitation.id;
    } else if (client.application.registrationMode !== "open") {
      return false;
    }

    await tx.applicationMember.upsert({
      where: {
        applicationId_userId: {
          applicationId: client.application.id,
          userId,
        },
      },
      create: { applicationId: client.application.id, userId, status: "active" },
      update: {},
    });
    await tx.applicationSubject.upsert({
      where: {
        applicationId_userId: {
          applicationId: client.application.id,
          userId,
        },
      },
      create: {
        applicationId: client.application.id,
        userId,
        subject: randomBytes(32).toString("base64url"),
      },
      update: {},
    });
    if (invitationId) {
      await tx.applicationInvitation.updateMany({
        where: { id: invitationId, status: "pending" },
        data: { status: "accepted", acceptedAt: new Date() },
      });
    }
    return true;
  });
}

export async function recordApplicationAuthorizationDenied(input: {
  userId: string;
  result: Extract<ApplicationClientAccessResult, { allowed: false }>;
}) {
  if (!input.result.applicationId || !input.result.clientId) {
    return;
  }

  try {
    await prisma.activityEvent.create({
      data: {
        type: "oauth.authorization.denied",
        actorUserId: input.userId,
        message: "Application authorization denied",
        severity: "warning",
        metadata: {
          applicationId: input.result.applicationId,
          clientId: input.result.clientId,
          reason: input.result.reason,
        },
      },
    });
  } catch (error) {
    console.error("OAuth authorization activity recording failed", error);
  }
}
