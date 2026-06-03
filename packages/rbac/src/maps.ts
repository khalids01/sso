import { AllPermissions, Permissions, type Permission } from "./permissions";
import { Roles, type RoleSlug } from "./roles";

const adminPermissions = AllPermissions.filter(
  (permission) =>
    permission !== Permissions.AdminUsersGrantAdmin,
) as Permission[];

const platformAdminPermissions = adminPermissions;

const platformUserPermissions = [
  Permissions.FeedbackSubmit,
  Permissions.NotificationsUse,
] as const satisfies readonly Permission[];

export const RolePermissionMap = {
  [Roles.PlatformOwner]: AllPermissions,
  [Roles.PlatformAdmin]: platformAdminPermissions,
  [Roles.PlatformUser]: platformUserPermissions,
} as const satisfies Record<RoleSlug, readonly Permission[]>;
