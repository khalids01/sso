import type { Role } from "@db";
import { Permissions, hasPermission, type Permission } from "@rbac";

export class RbacPolicyError extends Error {
  status = 403;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

function policyError(message: string, status = 403): never {
  throw new RbacPolicyError(message, status);
}

export function actorCanManageOwners(
  permissions: ReadonlySet<Permission> | readonly Permission[],
) {
  return hasPermission(permissions, Permissions.AdminUsersGrantAdmin);
}

export function isOwnerRole(role: Role | string | null | undefined) {
  return role === "OWNER";
}

export function assertActorCanAccessOwnerTarget(args: {
  actorPermissions: ReadonlySet<Permission> | readonly Permission[];
  targetRole: Role | string | null | undefined;
}) {
  if (
    isOwnerRole(args.targetRole) &&
    !actorCanManageOwners(args.actorPermissions)
  ) {
    policyError("Only owners can access owner accounts");
  }
}

export function assertActorCanGrantAdminRole(args: {
  actorPermissions: ReadonlySet<Permission> | readonly Permission[];
  nextRole?: Role | string | null;
}) {
  if (
    args.nextRole === "ADMIN" &&
    !actorCanManageOwners(args.actorPermissions)
  ) {
    policyError("Only owners can grant admin role");
  }
}

export function assertNotAssignableOwnerRole(role?: Role | string | null) {
  if (role === "OWNER") {
    throw new Error("Owner role cannot be assigned from user management");
  }
}

export function assertActorCanChangePrivilegedAccounts(args: {
  actorPermissions: ReadonlySet<Permission> | readonly Permission[];
  targetRole: Role | string | null | undefined;
}) {
  const privileged =
    args.targetRole === "OWNER" || args.targetRole === "ADMIN";

  if (privileged && !actorCanManageOwners(args.actorPermissions)) {
    policyError("Only owners can change admin or owner accounts");
  }
}

export function assertNotSelfTarget(args: {
  actorId?: string;
  targetId: string;
  action: string;
}) {
  if (args.actorId === args.targetId) {
    policyError(`You cannot ${args.action} your own account`);
  }
}

export function shouldHideOwnerUsers(
  permissions: ReadonlySet<Permission> | readonly Permission[],
) {
  return !actorCanManageOwners(permissions);
}

export function filterOwnerUsers<T extends { role: Role | string }>(
  users: T[],
  permissions: ReadonlySet<Permission> | readonly Permission[],
) {
  if (!shouldHideOwnerUsers(permissions)) {
    return users;
  }

  return users.filter((user) => !isOwnerRole(user.role));
}
