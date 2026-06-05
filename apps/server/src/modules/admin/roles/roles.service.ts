import {
  createCustomRole,
  deleteCustomRole,
  getRoleById,
  getUserIdsForRole,
  listAssignableRoles,
  listPermissionCatalog,
  listRoles,
  replaceRolePermissions,
  resetRolePermissionsFromMap,
  updateCustomRoleMetadata,
} from "@db/rbac/roles";
import { type Permission } from "@rbac";
import { activityService } from "../activity/activity.service";
import { setCachedRolePermissions } from "@/rbac/cache/role-permissions";
import { invalidateRole } from "@/rbac/cache/invalidate";
import {
  assertActorCanGrantPermissions,
  assertPermissionsAreCatalogOnly,
  assertRoleCanBeDeleted,
  assertRoleCanBeReset,
  assertRoleIsEditable,
  RolesPolicyError,
} from "@/rbac/policies/roles.policy";

export type AdminActor = {
  id?: string;
  permissions: ReadonlySet<Permission>;
};

function assertAuthenticatedActor(actor?: AdminActor) {
  if (!actor?.id) {
    throw new RolesPolicyError("Admin actor is required", 401);
  }
}

async function refreshRolePermissionCache(roleId: string, permissions: Permission[]) {
  await setCachedRolePermissions(roleId, permissions);
  const userIds = await getUserIdsForRole(roleId);
  await invalidateRole(roleId, userIds);
}

export class RolesService {
  async listRoles() {
    const roles = await listRoles();

    return roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      scope: role.scope,
      isSystem: role.isSystem,
      isProtected: role.isProtected,
      customizedAt: role.customizedAt,
      permissionCount: role._count.permissions,
      userCount: role._count.userAssignments,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async listAssignableRoles() {
    return listAssignableRoles();
  }

  async listPermissionCatalog() {
    return listPermissionCatalog();
  }

  async getRoleById(roleId: string) {
    const role = await getRoleById(roleId);

    if (!role) {
      return null;
    }

    const { permissions, _count, ...rest } = role;

    return {
      ...rest,
      permissions,
      permissionCount: _count.permissions,
      userCount: _count.userAssignments,
    };
  }

  async createRole(
    data: {
      slug: string;
      name: string;
      permissions?: Permission[];
    },
    actor: AdminActor,
  ) {
    assertAuthenticatedActor(actor);
    assertActorCanGrantPermissions({
      actorPermissions: actor.permissions,
      permissionNames: data.permissions ?? [],
    });

    const catalog = await listPermissionCatalog();
    const catalogNames = new Set(catalog.map((entry) => entry.name));
    assertPermissionsAreCatalogOnly(data.permissions ?? [], catalogNames);

    const role = await createCustomRole(data);

    await refreshRolePermissionCache(role.id, role.permissions);

    await activityService.record({
      type: "role.created",
      actorUserId: actor.id,
      message: `Role ${role.name} (${role.slug}) created`,
      metadata: {
        roleId: role.id,
        slug: role.slug,
        permissionCount: role.permissions.length,
      },
    });

    return role;
  }

  async updateRoleMetadata(
    roleId: string,
    data: { name: string },
    actor: AdminActor,
  ) {
    assertAuthenticatedActor(actor);

    const role = await getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    assertRoleIsEditable({
      slug: role.slug,
      isProtected: role.isProtected,
    });

    const updated = await updateCustomRoleMetadata(roleId, data);

    await activityService.record({
      type: "role.updated",
      actorUserId: actor.id,
      message: `Role ${updated.slug} renamed to ${updated.name}`,
      metadata: {
        roleId: updated.id,
        slug: updated.slug,
      },
    });

    return updated;
  }

  async updateRolePermissions(
    roleId: string,
    permissions: Permission[],
    actor: AdminActor,
  ) {
    assertAuthenticatedActor(actor);

    const role = await getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    assertRoleIsEditable({
      slug: role.slug,
      isProtected: role.isProtected,
    });

    const catalog = await listPermissionCatalog();
    const catalogNames = new Set(catalog.map((entry) => entry.name));
    assertPermissionsAreCatalogOnly(permissions, catalogNames);
    assertActorCanGrantPermissions({
      actorPermissions: actor.permissions,
      permissionNames: permissions,
    });

    const updatedPermissions = await replaceRolePermissions(roleId, permissions);
    await refreshRolePermissionCache(roleId, [...updatedPermissions]);

    await activityService.record({
      type: "role.permissions_updated",
      actorUserId: actor.id,
      message: `Permissions updated for role ${role.name} (${role.slug})`,
      metadata: {
        roleId,
        slug: role.slug,
        permissionCount: updatedPermissions.length,
      },
    });

    return this.getRoleById(roleId);
  }

  async resetRole(roleId: string, actor: AdminActor) {
    assertAuthenticatedActor(actor);

    const role = await getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    assertRoleCanBeReset({
      slug: role.slug,
      isProtected: role.isProtected,
      isSystem: role.isSystem,
    });

    const result = await resetRolePermissionsFromMap(role.slug);
    await refreshRolePermissionCache(result.roleId, [...result.permissions]);

    await activityService.record({
      type: "role.reset",
      actorUserId: actor.id,
      message: `Role ${role.name} (${role.slug}) reset to defaults`,
      metadata: {
        roleId,
        slug: role.slug,
      },
    });

    return this.getRoleById(roleId);
  }

  async deleteRole(roleId: string, actor: AdminActor) {
    assertAuthenticatedActor(actor);

    const role = await getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    assertRoleCanBeDeleted({
      isSystem: role.isSystem,
      isProtected: role.isProtected,
      userAssignments: role._count.userAssignments,
    });

    const deleted = await deleteCustomRole(roleId);

    await activityService.record({
      type: "role.deleted",
      actorUserId: actor.id,
      message: `Role ${deleted.name} (${deleted.slug}) deleted`,
      metadata: {
        roleId: deleted.id,
        slug: deleted.slug,
      },
    });

    return { success: true };
  }
}

export const rolesService = new RolesService();

export { RolesPolicyError };
