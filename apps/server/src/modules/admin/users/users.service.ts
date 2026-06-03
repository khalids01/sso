import prisma from "@db";
import type { Role } from "@db";
import type { Permission } from "@rbac";
import { sendEmail, invitationTemplate } from "@email";
import { env } from "@env/server";
import { siteConfig } from "@config";
import { activityService } from "../activity/activity.service";
import {
  assertActorCanAccessOwnerTarget,
  assertActorCanChangePrivilegedAccounts,
  assertActorCanGrantAdminRole,
  assertNotAssignableOwnerRole,
  assertNotSelfTarget,
  filterOwnerUsers,
  isOwnerRole,
} from "@/rbac/policies/owner.policy";
import { syncLegacyUserRole } from "@/rbac/policies/sync-user-role";

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  banned: true,
  banReason: true,
  archived: true,
  onboardingComplete: true,
  plan: true,
  subscriptionStatus: true,
};

export type AdminActor = {
  id?: string;
  permissions: ReadonlySet<Permission>;
};

class AdminUserPolicyError extends Error {
  status = 403;
}

function policyError(message: string): never {
  throw new AdminUserPolicyError(message);
}

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 10, 1), 100);
  const normalizedPage = Math.max(page ?? 1, 1);

  return {
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

function assertAuthenticatedActor(actor?: AdminActor) {
  if (!actor?.id) {
    policyError("Admin actor is required");
  }
}

async function getAdminTargetUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

async function assertNotLastOwner(targetRole: Role) {
  if (targetRole !== "OWNER") {
    return;
  }

  const ownerCount = await prisma.user.count({
    where: {
      role: "OWNER",
      banned: false,
      archived: false,
    },
  });

  if (ownerCount <= 1) {
    policyError("Cannot disable or delete the last active owner");
  }
}

async function assertCanUpdateUser(args: {
  actor: AdminActor;
  targetId: string;
  data: { role?: Role };
}) {
  assertAuthenticatedActor(args.actor);
  assertNotAssignableOwnerRole(args.data.role);

  const target = await getAdminTargetUser(args.targetId);

  assertActorCanAccessOwnerTarget({
    actorPermissions: args.actor.permissions,
    targetRole: target.role,
  });

  assertActorCanGrantAdminRole({
    actorPermissions: args.actor.permissions,
    nextRole: args.data.role,
  });
}

async function assertCanUseDestructiveAction(args: {
  actor: AdminActor;
  targetId: string;
  action: "ban" | "archive" | "delete";
}) {
  assertAuthenticatedActor(args.actor);

  assertNotSelfTarget({
    actorId: args.actor.id,
    targetId: args.targetId,
    action: args.action,
  });

  const target = await getAdminTargetUser(args.targetId);

  assertActorCanChangePrivilegedAccounts({
    actorPermissions: args.actor.permissions,
    targetRole: target.role,
  });

  await assertNotLastOwner(target.role);
}

export class UsersService {
  async listUsers(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      role?: Role;
      banned?: boolean;
      archived?: boolean;
    },
    actor?: AdminActor,
  ) {
    const { search, role, banned, archived } = query;
    const { page, limit } = normalizePagination(query.page, query.limit);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role) where.role = role;
    if (banned !== undefined) where.banned = banned;
    if (archived !== undefined) where.archived = archived;

    const [rawUsers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: adminUserSelect,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    const users = actor
      ? filterOwnerUsers(rawUsers, actor.permissions)
      : rawUsers;

    return {
      users,
      total: actor ? users.length : total,
      pages: Math.ceil((actor ? users.length : total) / limit),
    };
  }

  async getUserById(id: string, actor?: AdminActor) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...adminUserSelect,
        invitations: {
          select: {
            id: true,
            email: true,
            role: true,
            expiresAt: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    if (actor && isOwnerRole(user.role)) {
      try {
        assertActorCanAccessOwnerTarget({
          actorPermissions: actor.permissions,
          targetRole: user.role,
        });
      } catch {
        return null;
      }
    }

    return user;
  }

  async updateUser(
    id: string,
    data: { name?: string; role?: Role },
    actor: AdminActor,
  ) {
    await assertCanUpdateUser({
      actor,
      targetId: id,
      data,
    });

    const user = await prisma.user.update({
      where: { id },
      data,
      select: adminUserSelect,
    });

    if (data.role) {
      await syncLegacyUserRole(id, data.role);

      await activityService.record({
        type: "user.role_updated",
        actorUserId: actor.id,
        targetUserId: id,
        message: `${user.name} role changed to ${data.role}`,
        metadata: {
          role: data.role,
          email: user.email,
        },
      });
    }

    return user;
  }

  async banUser(id: string, reason: string | undefined, actor: AdminActor) {
    await assertCanUseDestructiveAction({
      actor,
      targetId: id,
      action: "ban",
    });

    const user = await prisma.user.update({
      where: { id },
      data: { banned: true, banReason: reason },
      select: adminUserSelect,
    });

    await activityService.record({
      type: "user.banned",
      actorUserId: actor.id,
      targetUserId: id,
      severity: "warning",
      message: `${user.name} was banned`,
      metadata: {
        email: user.email,
        reason: reason ?? null,
      },
    });

    return user;
  }

  async unbanUser(id: string, actor: AdminActor) {
    const user = await prisma.user.update({
      where: { id },
      data: { banned: false, banReason: null },
      select: adminUserSelect,
    });

    await activityService.record({
      type: "user.unbanned",
      actorUserId: actor.id,
      targetUserId: id,
      message: `${user.name} was unbanned`,
      metadata: {
        email: user.email,
      },
    });

    return user;
  }

  async archiveUser(id: string, actor: AdminActor) {
    await assertCanUseDestructiveAction({
      actor,
      targetId: id,
      action: "archive",
    });

    const user = await prisma.user.update({
      where: { id },
      data: { archived: true },
      select: adminUserSelect,
    });

    await activityService.record({
      type: "user.archived",
      actorUserId: actor.id,
      targetUserId: id,
      severity: "warning",
      message: `${user.name} was archived`,
      metadata: {
        email: user.email,
      },
    });

    return user;
  }

  async restoreUser(id: string, actor: AdminActor) {
    const user = await prisma.user.update({
      where: { id },
      data: { archived: false },
      select: adminUserSelect,
    });

    await activityService.record({
      type: "user.restored",
      actorUserId: actor.id,
      targetUserId: id,
      message: `${user.name} was restored`,
      metadata: {
        email: user.email,
      },
    });

    return user;
  }

  async deleteUserPermanent(id: string, actor: AdminActor) {
    await assertCanUseDestructiveAction({
      actor,
      targetId: id,
      action: "delete",
    });

    return prisma.user.delete({
      where: { id },
      select: adminUserSelect,
    });
  }

  async inviteUser(email: string, role: Role = "USER", inviterId: string) {
    assertNotAssignableOwnerRole(role);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("User already exists");

    const inviter = await prisma.user.findUnique({ where: { id: inviterId } });
    const inviterName = inviter?.name || "A team member";

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        email,
        role,
        inviterId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const inviteUrl = `${env.CORS_ORIGIN}/accept-invitation?id=${invitation.id}`;
    const invitedRole = role === "ADMIN" ? "ADMIN" : "USER";
    await sendEmail({
      to: email,
      subject: `Invitation: Join ${siteConfig.name} as ${invitedRole === "ADMIN" ? "Admin" : "User"}`,
      html: await invitationTemplate({
        inviteUrl,
        inviterName,
        invitedEmail: email,
        invitedRole,
        expiresInDays: 7,
      }),
    });

    await activityService.record({
      type: "user.invited",
      actorUserId: inviterId,
      message: `${email} was invited as ${role}`,
      metadata: {
        email,
        role,
        invitationId: invitation.id,
      },
    });

    return invitation;
  }

  async getUserSessions(id: string) {
    return prisma.session.findMany({
      where: { userId: id },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const usersService = new UsersService();
export { AdminUserPolicyError };
