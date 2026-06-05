import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@rbac";
import type { AuthUser } from "@auth/server";
import { getAccountStatusRejection } from "@/guards/account-status";

type PermissionGuardContext = {
  user?: AuthUser | null;
  permissions?: ReadonlySet<Permission>;
  set: {
    status?: number | string;
  };
};

function forbidden(set: PermissionGuardContext["set"]) {
  set.status = 403;
  return { message: "Forbidden", status: 403 };
}

function unauthorized(set: PermissionGuardContext["set"]) {
  set.status = 401;
  return { message: "Unauthorized", status: 401 };
}

function runPermissionGuard(
  ctx: PermissionGuardContext,
  check: (permissions: ReadonlySet<Permission>) => boolean,
) {
  const rejection = getAccountStatusRejection(ctx.user);
  if (rejection) {
    ctx.set.status = rejection.status;
    return rejection;
  }

  if (!ctx.permissions) {
    return unauthorized(ctx.set);
  }

  if (!check(ctx.permissions)) {
    return forbidden(ctx.set);
  }
}

export const requirePermission =
  (required: Permission) => (ctx: PermissionGuardContext) => {
    return runPermissionGuard(ctx, (permissions) =>
      hasPermission(permissions, required),
    );
  };

export const requireAnyPermission =
  (required: readonly Permission[]) => (ctx: PermissionGuardContext) => {
    return runPermissionGuard(ctx, (permissions) =>
      hasAnyPermission(permissions, required),
    );
  };

export const requireAllPermissions =
  (required: readonly Permission[]) => (ctx: PermissionGuardContext) => {
    return runPermissionGuard(ctx, (permissions) =>
      hasAllPermissions(permissions, required),
    );
  };
