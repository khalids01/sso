import type { Permission } from "./permissions";
import type { RoleSlug } from "./roles";

export type PermissionEffect = "grant" | "deny";

export type PermissionOverride = {
  permission: Permission;
  effect: PermissionEffect;
};

export type SessionRoleSummary = {
  slug: RoleSlug;
  name: string;
};

export type UserSessionRbacPayload = {
  permissions: Permission[];
  roles: SessionRoleSummary[];
  primaryRoleSlug: RoleSlug;
  catalogVersion: number;
  computedAt: string;
};

/** @deprecated Use UserSessionRbacPayload */
export type EffectivePermissionsPayload = UserSessionRbacPayload;

export type RolePermissionSets = ReadonlyArray<readonly Permission[]>;
