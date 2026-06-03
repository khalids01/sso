import { describe, expect, it, mock } from "bun:test";
import { AllPermissions, RolePermissionMap, Roles } from "@rbac";
import { mockRedisModule } from "./helpers/mock-redis-module";

mockRedisModule();

const rbacState = {
  permissions: new Map<string, { id: string; name: string }>(),
  roles: new Map<string, { id: string; slug: string; isProtected: boolean; customizedAt: Date | null }>(),
  rolePermissions: new Map<string, Set<string>>(),
  userRoles: new Map<string, string>(),
};

mock.module("@db", () => ({
  default: {
    rbacPermission: {
      upsert: async ({ where, create }: { where: { name: string }; create: { name: string; group?: string } }) => {
        const existing = rbacState.permissions.get(where.name);
        if (existing) {
          return existing;
        }
        const row = { id: `perm-${where.name}`, name: create.name };
        rbacState.permissions.set(where.name, row);
        return row;
      },
      findMany: async () => [...rbacState.permissions.values()],
    },
    rbacRole: {
      upsert: async ({
        where,
        create,
      }: {
        where: { slug: string };
        create: { slug: string; name: string; isProtected?: boolean };
      }) => {
        const existing = rbacState.roles.get(where.slug);
        if (existing) {
          return { ...existing, ...create, id: existing.id };
        }
        const row = {
          id: `role-${where.slug}`,
          slug: create.slug,
          isProtected: Boolean(create.isProtected),
          customizedAt: null,
        };
        rbacState.roles.set(where.slug, row);
        return row;
      },
      findUnique: async ({ where }: { where: { slug: string } }) =>
        rbacState.roles.get(where.slug) ?? null,
      findMany: async () => [...rbacState.roles.values()],
    },
    rbacRolePermission: {
      deleteMany: async ({ where }: { where: { roleId: string } }) => {
        rbacState.rolePermissions.delete(where.roleId);
      },
      createMany: async ({
        data,
      }: {
        data: Array<{ roleId: string; permissionId: string }>;
      }) => {
        for (const row of data) {
          const set =
            rbacState.rolePermissions.get(row.roleId) ?? new Set<string>();
          set.add(row.permissionId);
          rbacState.rolePermissions.set(row.roleId, set);
        }
      },
    },
    rbacUserRole: {
      deleteMany: async () => ({}),
      create: async ({ data }: { data: { userId: string; roleId: string } }) => {
        rbacState.userRoles.set(data.userId, data.roleId);
      },
    },
    user: {
      findMany: async () => [
        { id: "user-1", role: "USER" },
        { id: "admin-1", role: "ADMIN" },
      ],
    },
    $disconnect: async () => {},
  },
}));

describe("rbac seed integration", () => {
  it("upserts all permissions and respects customized roles", async () => {
    rbacState.permissions.clear();
    rbacState.roles.clear();
    rbacState.rolePermissions.clear();
    rbacState.userRoles.clear();

    const { seedRbac } = await import(
      "../../../../packages/db/src/seed-rbac.ts"
    );

    await seedRbac();

    expect(rbacState.permissions.size).toBe(AllPermissions.length);

    const ownerRole = rbacState.roles.get(Roles.PlatformOwner);
    expect(ownerRole?.isProtected).toBe(true);

    const ownerPerms = rbacState.rolePermissions.get(ownerRole!.id);
    expect(ownerPerms?.size).toBe(RolePermissionMap[Roles.PlatformOwner].length);

    rbacState.roles.set(Roles.PlatformAdmin, {
      id: "role-admin",
      slug: Roles.PlatformAdmin,
      isProtected: false,
      customizedAt: new Date(),
    });

    await seedRbac();

    const adminPerms = rbacState.rolePermissions.get("role-admin");
    expect(adminPerms).toBeUndefined();
  });
});
