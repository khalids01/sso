import type { Permission } from "./permissions";
import type { PermissionOverride } from "./types";

export function flattenRolePermissions(
  rolePermissionSets: ReadonlyArray<readonly Permission[]>,
): Set<Permission> {
  const result = new Set<Permission>();

  for (const permissions of rolePermissionSets) {
    for (const permission of permissions) {
      result.add(permission);
    }
  }

  return result;
}

export function applyOverrides(
  base: Set<Permission>,
  overrides: readonly PermissionOverride[],
): Set<Permission> {
  const result = new Set(base);

  for (const override of overrides) {
    if (override.effect === "grant") {
      result.add(override.permission);
      continue;
    }

    result.delete(override.permission);
  }

  return result;
}

export function buildEffectiveSet(args: {
  rolePermissionSets: ReadonlyArray<readonly Permission[]>;
  overrides?: readonly PermissionOverride[];
}): Set<Permission> {
  const base = flattenRolePermissions(args.rolePermissionSets);
  return applyOverrides(base, args.overrides ?? []);
}

export function hasPermission(
  permissions: ReadonlySet<Permission> | readonly Permission[],
  required: Permission,
): boolean {
  if (permissions instanceof Set) {
    return permissions.has(required);
  }

  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: ReadonlySet<Permission> | readonly Permission[],
  required: readonly Permission[],
): boolean {
  return required.some((permission) => hasPermission(permissions, permission));
}

export function hasAllPermissions(
  permissions: ReadonlySet<Permission> | readonly Permission[],
  required: readonly Permission[],
): boolean {
  return required.every((permission) => hasPermission(permissions, permission));
}

export function toPermissionArray(
  permissions: ReadonlySet<Permission>,
): Permission[] {
  return [...permissions].sort();
}
