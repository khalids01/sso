import type { Permission, UserSessionRbacPayload } from "@rbac";
import {
  getCachedUserSessionRbac,
  setCachedUserSessionRbac,
} from "../cache/effective";
import {
  getCatalogVersion,
  isEffectiveCacheStale,
  isUserSessionRbacPayloadComplete,
} from "../cache/invalidate";
import { computeEffectivePermissionArrayFromSnapshot } from "./build-effective";
import { loadUserRbacSnapshot } from "./load-snapshot";

export async function getUserSessionRbac(
  userId: string,
): Promise<UserSessionRbacPayload> {
  const cached = await getCachedUserSessionRbac(userId);

  if (
    isUserSessionRbacPayloadComplete(cached) &&
    !(await isEffectiveCacheStale(cached))
  ) {
    return cached;
  }

  const snapshot = await loadUserRbacSnapshot(userId);
  const permissions = computeEffectivePermissionArrayFromSnapshot({
    rolePermissionSets: snapshot.rolePermissionSets,
    overrides: snapshot.overrides,
  });

  const catalogVersion = await getCatalogVersion();

  const payload: UserSessionRbacPayload = {
    permissions,
    roles: snapshot.roles,
    primaryRoleSlug: snapshot.primaryRoleSlug,
    catalogVersion,
    computedAt: new Date().toISOString(),
  };

  await setCachedUserSessionRbac(userId, payload);

  return payload;
}

export async function getEffectivePermissions(
  userId: string,
): Promise<ReadonlySet<Permission>> {
  const rbac = await getUserSessionRbac(userId);
  return new Set(rbac.permissions);
}

export function createPermissionChecker(
  permissions: ReadonlySet<Permission>,
) {
  return (required: Permission) => permissions.has(required);
}
