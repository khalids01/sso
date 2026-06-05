import prisma from "../prisma.server";
import { Prisma } from "../../../prisma/generated/client";
import {
  Roles,
  type Permission,
  type PermissionEffect,
  type PermissionOverride,
  type RoleSlug,
  type SessionRoleSummary,
} from "@rbac";

type SnapshotRow = {
  roles: Array<{ id: string; slug: string; name: string }> | null;
  role_permissions: Record<string, string[]> | null;
  overrides: Array<{ permission: string; effect: string }> | null;
};

export type UserRbacSnapshot = {
  roles: SessionRoleSummary[];
  roleIds: string[];
  rolePermissionSets: Permission[][];
  overrides: PermissionOverride[];
  primaryRoleSlug: RoleSlug;
};

function parseRoleSlug(slug: string): RoleSlug {
  return slug as RoleSlug;
}

function parsePermission(name: string): Permission {
  return name as Permission;
}

function parseEffect(effect: string): PermissionEffect {
  return effect as PermissionEffect;
}

export async function loadUserRbacSnapshot(
  userId: string,
): Promise<UserRbacSnapshot> {
  const [row] = await prisma.$queryRaw<SnapshotRow[]>(Prisma.sql`
    SELECT
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'slug', r.slug,
              'name', r.name
            )
            ORDER BY r.slug
          ),
          '[]'::json
        )
        FROM rbac_user_role ur
        INNER JOIN rbac_role r ON r.id = ur."roleId"
        WHERE ur."userId" = ${userId}
      ) AS roles,
      (
        SELECT COALESCE(
          json_object_agg(grouped."roleId", grouped.permission_names),
          '{}'::json
        )
        FROM (
          SELECT
            ur."roleId" AS "roleId",
            json_agg(DISTINCT p.name ORDER BY p.name) AS permission_names
          FROM rbac_user_role ur
          INNER JOIN rbac_role_permission rp ON rp."roleId" = ur."roleId"
          INNER JOIN rbac_permission p ON p.id = rp."permissionId"
          WHERE ur."userId" = ${userId}
          GROUP BY ur."roleId"
        ) grouped
      ) AS role_permissions,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'permission', p.name,
              'effect', uo.effect
            )
            ORDER BY p.name
          ),
          '[]'::json
        )
        FROM rbac_user_permission_override uo
        INNER JOIN rbac_permission p ON p.id = uo."permissionId"
        WHERE uo."userId" = ${userId}
      ) AS overrides
  `);

  const rolesJson = row?.roles ?? [];
  const rolePermissionsJson = row?.role_permissions ?? {};
  const overridesJson = row?.overrides ?? [];

  const roles: SessionRoleSummary[] = rolesJson.map((role) => ({
    slug: parseRoleSlug(role.slug),
    name: role.name,
  }));

  const roleIds = rolesJson.map((role) => role.id);
  const rolePermissionSets = roleIds.map((roleId) => {
    const names = rolePermissionsJson[roleId] ?? [];
    return names.map((name) => parsePermission(name));
  });

  const overrides: PermissionOverride[] = overridesJson.map((override) => ({
    permission: parsePermission(override.permission),
    effect: parseEffect(override.effect),
  }));

  const primaryRoleSlug = roles[0]?.slug ?? Roles.PlatformUser;

  return {
    roles,
    roleIds,
    rolePermissionSets,
    overrides,
    primaryRoleSlug,
  };
}
