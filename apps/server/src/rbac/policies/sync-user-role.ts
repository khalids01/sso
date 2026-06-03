import prisma from "@db";
import type { Role } from "@db";
import { Roles, type RoleSlug } from "@rbac";
import { legacyRoleToSlug, slugToLegacyRole } from "../constants";
import { invalidateUser } from "../cache/invalidate";

export async function syncLegacyUserRole(userId: string, role: Role) {
  const slug = legacyRoleToSlug[role];
  await assignUserRoleSlug(userId, slug);
}

export async function assignUserRoleSlug(userId: string, slug: RoleSlug) {
  const role = await prisma.rbacRole.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!role) {
    throw new Error(`RBAC role not found: ${slug}`);
  }

  await prisma.$transaction([
    prisma.rbacUserRole.deleteMany({ where: { userId } }),
    prisma.rbacUserRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { role: slugToLegacyRole[slug] },
    }),
  ]);

  await invalidateUser(userId);
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
