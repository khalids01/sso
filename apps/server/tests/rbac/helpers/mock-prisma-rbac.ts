import type { RbacGraph } from "./fixtures";

export function createRbacPrismaMock(graph: RbacGraph) {
  return {
    rbacPermission: {
      findMany: async () =>
        Object.values(graph.roles).flatMap((role) =>
          role.permissions.map((name) => ({
            id: `perm-${name}`,
            name,
          })),
        ),
      upsert: async () => ({}),
    },
    rbacRole: {
      findUnique: async ({ where }: { where: { slug?: string; id?: string } }) => {
        const role = Object.values(graph.roles).find(
          (entry) =>
            entry.slug === where.slug || entry.id === where.id,
        );
        if (!role) {
          return null;
        }
        return {
          id: role.id,
          slug: role.slug,
          isProtected: role.slug === "platform.owner",
          customizedAt: null,
          permissions: role.permissions.map((name) => ({
            permission: { name },
          })),
        };
      },
      findMany: async () =>
        Object.values(graph.roles).map((role) => ({
          id: role.id,
          permissions: role.permissions.map((name) => ({
            permission: { name },
          })),
        })),
      upsert: async () => ({}),
    },
    rbacRolePermission: {
      deleteMany: async () => ({ count: 0 }),
      createMany: async () => ({ count: 0 }),
    },
    rbacUserRole: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        const user = graph.users[where.userId];
        if (!user) {
          return [];
        }
        return user.roleSlugs.map((slug) => ({
          roleId: graph.roles[slug].id,
        }));
      },
      deleteMany: async () => ({ count: 0 }),
      create: async () => ({}),
    },
    rbacUserPermissionOverride: {
      findMany: async ({ where }: { where: { userId: string } }) => {
        const user = graph.users[where.userId];
        if (!user?.overrides) {
          return [];
        }
        return user.overrides.map((override) => ({
          effect: override.effect,
          permission: { name: override.permission },
        }));
      },
    },
    user: {
      findMany: async () => [],
      update: async () => ({}),
    },
    $transaction: async (actions: unknown[]) => {
      for (const action of actions) {
        if (typeof action === "function") {
          await action();
        }
      }
    },
  };
}
