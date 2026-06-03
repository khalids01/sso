import {
  AllPermissions,
  RolePermissionMap,
  Roles,
  type Permission,
  type RoleSlug,
} from "@rbac";

export type RbacGraphRole = {
  id: string;
  slug: RoleSlug;
  permissions: Permission[];
};

export type RbacGraphUser = {
  id: string;
  roleSlugs: RoleSlug[];
  overrides?: Array<{ permission: Permission; effect: "grant" | "deny" }>;
};

export type RbacGraph = {
  roles: Record<string, RbacGraphRole>;
  users: Record<string, RbacGraphUser>;
  catalogVersion?: number;
};

export function createTestGraph(
  partial: Partial<{
    roles: Partial<Record<RoleSlug, { id?: string; permissions?: Permission[] }>>;
    users: Record<
      string,
      {
        roleSlugs: RoleSlug[];
        overrides?: RbacGraphUser["overrides"];
      }
    >;
    catalogVersion: number;
  }> = {},
): RbacGraph {
  const roles: RbacGraph["roles"] = {};

  for (const slug of Object.values(Roles)) {
    roles[slug] = {
      id: partial.roles?.[slug]?.id ?? `role-${slug}`,
      slug,
      permissions: [
        ...(partial.roles?.[slug]?.permissions ?? RolePermissionMap[slug]),
      ],
    };
  }

  const users: RbacGraph["users"] = {};

  for (const [userId, user] of Object.entries(partial.users ?? {})) {
    users[userId] = {
      id: userId,
      roleSlugs: user.roleSlugs,
      overrides: user.overrides,
    };
  }

  return {
    roles,
    users,
    catalogVersion: partial.catalogVersion ?? 1,
  };
}

export function expectedPermissionsForUser(graph: RbacGraph, userId: string) {
  const user = graph.users[userId];
  if (!user) {
    return new Set<Permission>();
  }

  const base = new Set<Permission>();
  for (const slug of user.roleSlugs) {
    for (const permission of graph.roles[slug]?.permissions ?? []) {
      base.add(permission);
    }
  }

  for (const override of user.overrides ?? []) {
    if (override.effect === "grant") {
      base.add(override.permission);
    } else {
      base.delete(override.permission);
    }
  }

  return base;
}

export const allPermissionNames = [...AllPermissions];
