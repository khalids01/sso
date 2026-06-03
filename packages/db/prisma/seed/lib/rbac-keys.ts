export const RBAC_CATALOG_VERSION_KEY = "rbac:catalog:version";

export function rolePermissionsKey(roleId: string) {
  return `rbac:role:${roleId}:perms`;
}

export function effectivePermissionsKey(userId: string) {
  return `rbac:effective:${userId}`;
}
