import {
  Permissions,
  RolePermissionMap,
  hasPermission,
  type Permission,
} from "@sso/rbac";

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

export function assertRoleIsEditable(args: { isProtected: boolean }) {
  if (args.isProtected) {
    policyError("Protected roles cannot be modified");
  }
}

export function assertRoleCanBeReset(args: {
  slug: string;
  isProtected: boolean;
  isSystem: boolean;
}) {
  if (args.isProtected) {
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
}) {
  if (args.isSystem || args.isProtected) {
    policyError("System or protected roles cannot be deleted");
  }
}

export function assertValidReassignTarget(args: {
  sourceRoleId: string;
  targetRoleId: string;
  targetIsProtected: boolean;
}) {
  if (args.sourceRoleId === args.targetRoleId) {
    policyError("Cannot reassign users to the same role being deleted");
  }

  if (args.targetIsProtected) {
    policyError("Cannot reassign users to a protected role");
  }
}

export function assertActorCannotManageOwnRole(args: {
  actorRoleId?: string | null;
  targetRoleId: string;
}) {
  if (args.actorRoleId && args.actorRoleId === args.targetRoleId) {
    policyError("You cannot modify the role assigned to your account");
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
  for (const permission of args.permissionNames) {
    if (!hasPermission(args.actorPermissions, permission)) {
      policyError(`You cannot grant permission you do not hold: ${permission}`);
    }
  }
}

export function actorCanManageRoles(
  permissions: ReadonlySet<Permission> | readonly Permission[],
) {
  return hasPermission(permissions, Permissions.AdminRolesManage);
}
