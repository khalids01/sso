import prisma from "../../src/index.ts";
import {
  AllPermissions,
  RoleDefinitions,
  RolePermissionMap,
  Roles,
  permissionGroup,
  type Permission,
  type RoleSlug,
} from "@rbac";
import { getRedis, connectRedis } from "@redis";
import {
  RBAC_CATALOG_VERSION_KEY,
  rolePermissionsKey,
} from "./lib/rbac-keys.ts";

const CATALOG_VERSION = 1;

async function upsertPermissions() {
  for (const name of AllPermissions) {
    await prisma.rbacPermission.upsert({
      where: { name },
      create: {
        name,
        group: permissionGroup(name),
        isSystem: true,
      },
      update: {
        group: permissionGroup(name),
        isSystem: true,
      },
    });
  }
}

async function upsertRoles() {
  const roles: Record<RoleSlug, { id: string }> = {} as Record<
    RoleSlug,
    { id: string }
  >;

  for (const definition of Object.values(RoleDefinitions)) {
    const role = await prisma.rbacRole.upsert({
      where: { slug: definition.slug },
      create: {
        slug: definition.slug,
        name: definition.name,
        scope: definition.scope,
        isSystem: definition.isSystem,
        isProtected: definition.isProtected,
        seedVersion: CATALOG_VERSION,
      },
      update: {
        name: definition.name,
        scope: definition.scope,
        isSystem: definition.isSystem,
        isProtected: definition.isProtected,
        seedVersion: CATALOG_VERSION,
      },
    });

    roles[definition.slug] = { id: role.id };
  }

  return roles;
}

async function syncRolePermissions(
  roles: Record<RoleSlug, { id: string }>,
) {
  const permissions = await prisma.rbacPermission.findMany({
    select: { id: true, name: true },
  });
  const permissionByName = new Map(
    permissions.map((permission) => [permission.name, permission.id]),
  );

  for (const [slug, permissionNames] of Object.entries(RolePermissionMap)) {
    const roleSlug = slug as RoleSlug;
    const role = await prisma.rbacRole.findUnique({
      where: { slug: roleSlug },
      select: {
        id: true,
        isProtected: true,
        customizedAt: true,
      },
    });

    if (!role) {
      continue;
    }

    const shouldSync =
      role.isProtected || role.customizedAt === null;

    if (!shouldSync) {
      continue;
    }

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
  }

  return roles;
}

async function backfillUserRoles(roles: Record<RoleSlug, { id: string }>) {
  const legacyToSlug: Record<string, RoleSlug> = {
    OWNER: Roles.PlatformOwner,
    ADMIN: Roles.PlatformAdmin,
    USER: Roles.PlatformUser,
  };

  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });

  for (const user of users) {
    const slug = legacyToSlug[user.role];
    if (!slug) {
      continue;
    }

    const roleId = roles[slug].id;

    await prisma.rbacUserRole.deleteMany({
      where: { userId: user.id },
    });

    await prisma.rbacUserRole.create({
      data: {
        userId: user.id,
        roleId,
      },
    });
  }
}

async function warmRolePermissionCaches() {
  const redis = await connectRedis();

  await redis.set(RBAC_CATALOG_VERSION_KEY, String(CATALOG_VERSION));

  const roles = await prisma.rbacRole.findMany({
    select: {
      id: true,
      permissions: {
        select: {
          permission: {
            select: { name: true },
          },
        },
      },
    },
  });

  for (const role of roles) {
    const names = role.permissions.map(
      (entry) => entry.permission.name as Permission,
    );

    await redis.set(
      rolePermissionsKey(role.id),
      JSON.stringify(names.sort()),
    );
  }
}

export async function seedRbac() {
  await upsertPermissions();
  const roles = await upsertRoles();
  await syncRolePermissions(roles);
  await backfillUserRoles(roles);

  try {
    await warmRolePermissionCaches();
  } catch (error) {
    console.warn("[rbac seed] Redis warm skipped:", error);
  }
}

if (import.meta.main) {
  await seedRbac();
  console.log("RBAC seed completed");
  await prisma.$disconnect();
  try {
    const redis = getRedis();
    if (redis.status === "ready") {
      await redis.quit();
    }
  } catch {
    // Redis optional during seed
  }
}
