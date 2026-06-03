import type { Permission } from "@rbac";
import {
  getCachedEffectivePermissions,
  setCachedEffectivePermissions,
} from "../cache/effective";
import {
  getCatalogVersion,
  isEffectiveCacheStale,
} from "../cache/invalidate";
import { computeEffectivePermissionArray } from "./build-effective";
import { loadUserRbacContext } from "./load-user-context";

export async function getEffectivePermissions(
  userId: string,
): Promise<ReadonlySet<Permission>> {
  const cached = await getCachedEffectivePermissions(userId);

  if (cached && !(await isEffectiveCacheStale(cached))) {
    return new Set(cached.permissions);
  }

  const context = await loadUserRbacContext(userId);
  const permissions = await computeEffectivePermissionArray({
    roleIds: context.roleIds,
    overrides: context.overrides,
  });

  const catalogVersion = await getCatalogVersion();

  await setCachedEffectivePermissions(userId, {
    permissions,
    catalogVersion,
    computedAt: new Date().toISOString(),
  });

  return new Set(permissions);
}

export function createPermissionChecker(
  permissions: ReadonlySet<Permission>,
) {
  return (required: Permission) => permissions.has(required);
}
