import prisma from "../client.server";
import { Roles, type RoleSlug } from "@rbac";

export async function getRoleIdBySlug(slug: string): Promise<string> {
  const role = await prisma.rbacRole.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!role) {
    throw new Error(`RBAC role not found: ${slug}`);
  }

  return role.id;
}

export async function assignUserRole(userId: string, slug: string) {
  const roleId = await getRoleIdBySlug(slug);

  await prisma.$transaction([
    prisma.rbacUserRole.deleteMany({ where: { userId } }),
    prisma.rbacUserRole.create({
      data: {
        userId,
        roleId,
      },
    }),
  ]);
}

export async function getPrimaryRoleSlug(userId: string): Promise<RoleSlug> {
  const assignment = await prisma.rbacUserRole.findFirst({
    where: { userId },
    select: {
      role: {
        select: { slug: true },
      },
    },
  });

  if (!assignment?.role.slug) {
    return Roles.PlatformUser;
  }

  return assignment.role.slug as RoleSlug;
}

export async function hasPlatformOwner(): Promise<boolean> {
  const count = await prisma.user.count({
    where: {
      banned: false,
      archived: false,
      rbacRoles: {
        some: {
          role: {
            slug: Roles.PlatformOwner,
          },
        },
      },
    },
  });

  return count > 0;
}

export async function countActivePlatformOwners(): Promise<number> {
  return prisma.user.count({
    where: {
      banned: false,
      archived: false,
      rbacRoles: {
        some: {
          role: {
            slug: Roles.PlatformOwner,
          },
        },
      },
    },
  });
}
