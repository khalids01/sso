import type { Role } from "@db";
import { Roles, type RoleSlug } from "@rbac";

export const legacyRoleToSlug: Record<Role, RoleSlug> = {
  OWNER: Roles.PlatformOwner,
  ADMIN: Roles.PlatformAdmin,
  USER: Roles.PlatformUser,
};

export const slugToLegacyRole: Record<RoleSlug, Role> = {
  [Roles.PlatformOwner]: "OWNER",
  [Roles.PlatformAdmin]: "ADMIN",
  [Roles.PlatformUser]: "USER",
};
