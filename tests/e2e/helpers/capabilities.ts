import { Permissions, type Permission } from "../../../packages/rbac/src/index";

export type SessionContext = {
  user: { email: string; name: string };
  permissions: string[];
  roles: string[];
  primaryRoleSlug: string;
  primaryRoleId: string | null;
};

export const actionRegistry = {
  accessAdmin: Permissions.AdminAccess,
  readApplications: Permissions.AdminApplicationsRead,
  manageApplications: Permissions.AdminApplicationsManage,
} as const satisfies Record<string, Permission>;

export function deriveCapabilities(session: SessionContext) {
  const permissions = new Set(session.permissions);
  return Object.fromEntries(
    Object.entries(actionRegistry).map(([action, permission]) => [
      action,
      permissions.has(permission),
    ]),
  ) as Record<keyof typeof actionRegistry, boolean>;
}
