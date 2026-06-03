import type { Permission } from "./permissions";

export type PermissionEffect = "grant" | "deny";

export type PermissionOverride = {
  permission: Permission;
  effect: PermissionEffect;
};

export type EffectivePermissionsPayload = {
  permissions: Permission[];
  catalogVersion: number;
  computedAt: string;
};

export type RolePermissionSets = ReadonlyArray<readonly Permission[]>;
