export const RBAC_CATALOG_VERSION_KEY = "rbac:catalog:version";

export const EFFECTIVE_PERMISSIONS_TTL_SECONDS = 900;

export function rolePermissionsKey(roleId: string) {
  return `rbac:role:${roleId}:perms`;
}

export function effectivePermissionsKey(userId: string) {
  return `rbac:effective:${userId}`;
}
