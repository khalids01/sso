import prisma from "../client.server";
import { RolePermissionMap, type Permission, type RoleSlug } from "@rbac";

async function getPermissionIdByName() {
  const permissions = await prisma.rbacPermission.findMany({
    select: { id: true, name: true },
  });

  return new Map(permissions.map((permission) => [permission.name, permission.id]));
}

export async function syncRolePermissionsForSlug(
  slug: RoleSlug,
  options?: { force?: boolean },
) {
  const permissionNames = RolePermissionMap[slug];
  if (!permissionNames) {
    throw new Error(`No permission map defined for role: ${slug}`);
  }

  const role = await prisma.rbacRole.findUnique({
    where: { slug },
    select: {
      id: true,
      isProtected: true,
      customizedAt: true,
    },
  });

  if (!role) {
    throw new Error(`Role not found: ${slug}`);
  }

  const shouldSync =
    options?.force === true ||
    role.isProtected ||
    role.customizedAt === null;

  if (!shouldSync) {
    return { roleId: role.id, synced: false as const };
  }

  const permissionByName = await getPermissionIdByName();
  const permissionIds = permissionNames
    .map((name) => permissionByName.get(name))
    .filter((id): id is string => Boolean(id));

  await prisma.rbacRolePermission.deleteMany({
    where: { roleId: role.id },
  });

  if (permissionIds.length > 0) {
    await prisma.rbacRolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  if (!role.isProtected && options?.force === true) {
    await prisma.rbacRole.update({
      where: { id: role.id },
      data: { customizedAt: null },
    });
  }

  return {
    roleId: role.id,
    synced: true as const,
    permissions: permissionNames as Permission[],
  };
}

export async function syncAllRolePermissionsFromMap() {
  for (const slug of Object.keys(RolePermissionMap) as RoleSlug[]) {
    await syncRolePermissionsForSlug(slug);
  }
}
