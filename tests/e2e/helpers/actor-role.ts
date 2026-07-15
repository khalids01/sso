import { Roles, type RoleSlug } from "../../../packages/rbac/src/index";

const aliases: Record<string, RoleSlug> = {
  owner: Roles.PlatformOwner,
  admin: Roles.PlatformAdmin,
  user: Roles.PlatformUser,
  [Roles.PlatformOwner]: Roles.PlatformOwner,
  [Roles.PlatformAdmin]: Roles.PlatformAdmin,
  [Roles.PlatformUser]: Roles.PlatformUser,
};

export function resolveActorRole(value: string): RoleSlug {
  const role = aliases[value];
  if (!role) throw new Error(`Unsupported E2E actor role: ${value}`);
  return role;
}
