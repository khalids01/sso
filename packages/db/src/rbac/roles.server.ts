import prisma from "../client.server";
import { Roles, type Permission, type RoleSlug } from "@rbac";
import { syncRolePermissionsForSlug } from "./sync-role-permissions.server";

const RESERVED_SYSTEM_SLUGS = new Set([
  Roles.PlatformOwner,
  Roles.PlatformAdmin,
  Roles.PlatformUser,
]);

const CUSTOM_ROLE_SLUG_PATTERN = /^[a-z][a-z0-9._-]{2,}$/;

export function validateCustomRoleSlug(slug: string) {
  if (!CUSTOM_ROLE_SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Role slug must be lowercase, at least 3 characters, and use letters, numbers, dots, underscores, or hyphens",
    );
  }

  if (slug.startsWith("platform.")) {
    throw new Error("The platform.* slug namespace is reserved for system roles");
  }

  if (RESERVED_SYSTEM_SLUGS.has(slug as (typeof Roles)[keyof typeof Roles])) {
    throw new Error("This slug is reserved for a system role");
  }
}

export async function listRoles() {
  return prisma.rbacRole.findMany({
    orderBy: [{ isSystem: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      scope: true,
      isSystem: true,
      isProtected: true,
      customizedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          permissions: true,
          userAssignments: true,
        },
      },
    },
  });
}

export async function listAssignableRoles() {
  return prisma.rbacRole.findMany({
    where: {
      isProtected: false,
    },
    orderBy: [{ isSystem: "desc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      isSystem: true,
    },
  });
}

export async function getRoleById(roleId: string) {
  const role = await prisma.rbacRole.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      slug: true,
      name: true,
      scope: true,
      isSystem: true,
      isProtected: true,
      customizedAt: true,
      createdAt: true,
      updatedAt: true,
      permissions: {
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          permissions: true,
          userAssignments: true,
        },
      },
    },
  });

  if (!role) {
    return null;
  }

  return {
    ...role,
    permissions: role.permissions.map(
      (entry) => entry.permission.name as Permission,
    ),
  };
}

export async function listPermissionCatalog() {
  return prisma.rbacPermission.findMany({
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      group: true,
      description: true,
      isSystem: true,
    },
  });
}

async function resolvePermissionIds(names: readonly Permission[]) {
  const uniqueNames = [...new Set(names)];

  if (uniqueNames.length === 0) {
    return [];
  }

  const permissions = await prisma.rbacPermission.findMany({
    where: {
      name: { in: uniqueNames },
    },
    select: { id: true, name: true },
  });

  if (permissions.length !== uniqueNames.length) {
    const found = new Set(permissions.map((permission) => permission.name));
    const missing = uniqueNames.filter((name) => !found.has(name));
    throw new Error(`Unknown permissions: ${missing.join(", ")}`);
  }

  return permissions.map((permission) => permission.id);
}

export async function replaceRolePermissions(
  roleId: string,
  permissionNames: readonly Permission[],
) {
  const role = await prisma.rbacRole.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      isProtected: true,
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isProtected) {
    throw new Error("Protected roles cannot be modified");
  }

  const permissionIds = await resolvePermissionIds(permissionNames);

  await prisma.$transaction(async (tx) => {
    await tx.rbacRolePermission.deleteMany({
      where: { roleId: role.id },
    });

    if (permissionIds.length > 0) {
      await tx.rbacRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.rbacRole.update({
      where: { id: role.id },
      data: { customizedAt: new Date() },
    });
  });

  return permissionNames;
}

export async function resetRolePermissionsFromMap(slug: string) {
  const result = await syncRolePermissionsForSlug(slug as RoleSlug, {
    force: true,
  });

  if (!result.synced) {
    throw new Error("Role permissions could not be reset");
  }

  return {
    roleId: result.roleId,
    permissions: result.permissions ?? [],
  };
}

export async function createCustomRole(args: {
  slug: string;
  name: string;
  permissions?: readonly Permission[];
}) {
  validateCustomRoleSlug(args.slug);

  const existing = await prisma.rbacRole.findUnique({
    where: { slug: args.slug },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A role with this slug already exists");
  }

  const permissionIds = args.permissions?.length
    ? await resolvePermissionIds(args.permissions)
    : [];

  const role = await prisma.rbacRole.create({
    data: {
      slug: args.slug,
      name: args.name,
      scope: "platform",
      isSystem: false,
      isProtected: false,
      customizedAt: new Date(),
      permissions:
        permissionIds.length > 0
          ? {
              createMany: {
                data: permissionIds.map((permissionId) => ({
                  permissionId,
                })),
              },
            }
          : undefined,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      scope: true,
      isSystem: true,
      isProtected: true,
      customizedAt: true,
      permissions: {
        select: {
          permission: {
            select: { name: true },
          },
        },
      },
    },
  });

  return {
    ...role,
    permissions: role.permissions.map(
      (entry) => entry.permission.name as Permission,
    ),
  };
}

export async function updateCustomRoleMetadata(
  roleId: string,
  data: { name: string },
) {
  const role = await prisma.rbacRole.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      isSystem: true,
      isProtected: true,
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isSystem || role.isProtected) {
    throw new Error("Only custom roles can be renamed");
  }

  return prisma.rbacRole.update({
    where: { id: roleId },
    data: { name: data.name },
    select: {
      id: true,
      slug: true,
      name: true,
      isSystem: true,
      isProtected: true,
      customizedAt: true,
    },
  });
}

export async function deleteCustomRole(roleId: string) {
  const role = await prisma.rbacRole.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      slug: true,
      name: true,
      isSystem: true,
      isProtected: true,
      _count: {
        select: {
          userAssignments: true,
        },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  if (role.isSystem || role.isProtected) {
    throw new Error("System or protected roles cannot be deleted");
  }

  if (role._count.userAssignments > 0) {
    throw new Error("Cannot delete a role that is assigned to users");
  }

  await prisma.rbacRole.delete({
    where: { id: roleId },
  });

  return role;
}

export async function getUserIdsForRole(roleId: string) {
  const assignments = await prisma.rbacUserRole.findMany({
    where: { roleId },
    select: { userId: true },
  });

  return assignments.map((assignment) => assignment.userId);
}

export async function isAssignableRoleSlug(slug: string) {
  const role = await prisma.rbacRole.findUnique({
    where: { slug },
    select: {
      isProtected: true,
    },
  });

  return Boolean(role && !role.isProtected);
}
