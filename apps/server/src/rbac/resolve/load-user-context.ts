import prisma from "@db";
import type { Permission, PermissionOverride } from "@rbac";

export type UserRbacContext = {
  roleIds: string[];
  overrides: PermissionOverride[];
};

export async function loadUserRbacContext(
  userId: string,
): Promise<UserRbacContext> {
  const [assignments, overrides] = await Promise.all([
    prisma.rbacUserRole.findMany({
      where: { userId },
      select: { roleId: true },
    }),
    prisma.rbacUserPermissionOverride.findMany({
      where: { userId },
      select: {
        effect: true,
        permission: {
          select: { name: true },
        },
      },
    }),
  ]);

  return {
    roleIds: assignments.map((assignment) => assignment.roleId),
    overrides: overrides.map((override) => ({
      permission: override.permission.name as Permission,
      effect: override.effect as PermissionOverride["effect"],
    })),
  };
}
