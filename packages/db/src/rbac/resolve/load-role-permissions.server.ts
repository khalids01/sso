import prisma from "../prisma.server";
import type { Permission } from "@rbac";
import {
  getCachedRolePermissions,
  setCachedRolePermissions,
} from "../cache/role-permissions.server";

export async function loadRolePermissionsFromDb(
  roleId: string,
): Promise<Permission[]> {
  const role = await prisma.rbacRole.findUnique({
    where: { id: roleId },
    select: {
      permissions: {
        select: {
          permission: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!role) {
    return [];
  }

  return role.permissions.map(
    (entry) => entry.permission.name as Permission,
  );
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const cached = await getCachedRolePermissions(roleId);
  if (cached) {
    return cached;
  }

  const permissions = await loadRolePermissionsFromDb(roleId);
  await setCachedRolePermissions(roleId, permissions);
  return permissions;
}
