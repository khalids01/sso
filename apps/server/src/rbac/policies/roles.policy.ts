import {
  Permissions,
  RolePermissionMap,
  Roles,
  hasPermission,
  type Permission,
} from "@rbac";

export class RolesPolicyError extends Error {
  status = 403;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

function policyError(message: string, status = 403): never {
  throw new RolesPolicyError(message, status);
}

export function isProtectedOwnerRole(args: {
  slug: string;
  isProtected?: boolean;
}) {
  return args.isProtected === true || args.slug === Roles.PlatformOwner;
}

export function assertRoleIsEditable(args: {
  slug: string;
  isProtected: boolean;
}) {
  if (isProtectedOwnerRole(args)) {
    policyError("Protected roles cannot be modified");
  }
}

export function assertRoleCanBeReset(args: {
  slug: string;
  isProtected: boolean;
  isSystem: boolean;
}) {
  if (args.isProtected || args.slug === Roles.PlatformOwner) {
    policyError("Protected roles cannot be reset");
  }

  if (!args.isSystem) {
    policyError("Custom roles do not have default permissions to reset to");
  }

  if (!(args.slug in RolePermissionMap)) {
    policyError("This role does not have default permissions configured");
  }
}

export function assertRoleCanBeDeleted(args: {
  isSystem: boolean;
  isProtected: boolean;
  userAssignments: number;
}) {
  if (args.isSystem || args.isProtected) {
    policyError("System or protected roles cannot be deleted");
  }

  if (args.userAssignments > 0) {
    policyError("Cannot delete a role that is assigned to users");
  }
}

export function assertPermissionsAreCatalogOnly(
  permissionNames: readonly string[],
  catalogNames: ReadonlySet<string>,
) {
  const unknown = permissionNames.filter((name) => !catalogNames.has(name));

  if (unknown.length > 0) {
    throw new RolesPolicyError(
      `Unknown permissions: ${unknown.join(", ")}`,
      400,
    );
  }
}

export function assertActorCanGrantPermissions(args: {
  actorPermissions: ReadonlySet<Permission> | readonly Permission[];
  permissionNames: readonly Permission[];
}) {
  const includesGrantAdmin = args.permissionNames.includes(
    Permissions.AdminUsersGrantAdmin,
  );

  if (includesGrantAdmin && !hasPermission(args.actorPermissions, Permissions.AdminUsersGrantAdmin)) {
    policyError("Only owners can grant the admin grant permission");
  }
}

export function actorCanManageRoles(
  permissions: ReadonlySet<Permission> | readonly Permission[],
) {
  return hasPermission(permissions, Permissions.AdminRolesManage);
}
