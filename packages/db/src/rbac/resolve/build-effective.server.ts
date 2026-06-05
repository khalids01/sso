import {
  buildEffectiveSet,
  toPermissionArray,
  type Permission,
  type PermissionOverride,
} from "@rbac";
import { getRolePermissions } from "./load-role-permissions.server";

export async function computeEffectivePermissions(args: {
  roleIds: string[];
  overrides: readonly PermissionOverride[];
}): Promise<Set<Permission>> {
  const rolePermissionSets = await Promise.all(
    args.roleIds.map((roleId) => getRolePermissions(roleId)),
  );

  return buildEffectiveSet({
    rolePermissionSets,
    overrides: args.overrides,
  });
}

export async function computeEffectivePermissionArray(args: {
  roleIds: string[];
  overrides: readonly PermissionOverride[];
}): Promise<Permission[]> {
  const effective = await computeEffectivePermissions(args);
  return toPermissionArray(effective);
}

export function computeEffectivePermissionArrayFromSnapshot(args: {
  rolePermissionSets: ReadonlyArray<readonly Permission[]>;
  overrides: readonly PermissionOverride[];
}): Permission[] {
  const effective = buildEffectiveSet({
    rolePermissionSets: args.rolePermissionSets,
    overrides: args.overrides,
  });
  return toPermissionArray(effective);
}
