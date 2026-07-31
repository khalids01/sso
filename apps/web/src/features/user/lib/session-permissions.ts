import { hasPermission, type Permission } from "@sso/rbac";

export function sessionHasPermission(
  permissions: readonly string[] | undefined,
  required: Permission,
) {
  return hasPermission(permissions ?? [], required);
}
