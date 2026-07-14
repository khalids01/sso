import prisma from "./client.server";

export type ApplicationClientAccessDenialReason =
  | "client_not_found"
  | "client_inactive"
  | "application_inactive"
  | "membership_missing"
  | "membership_inactive"
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

  if (member.status !== "active") {
    return { allowed: false, reason: "membership_inactive", ...context };
  }

  return {
    allowed: true,
    ...context,
    memberId: member.id,
  };
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
