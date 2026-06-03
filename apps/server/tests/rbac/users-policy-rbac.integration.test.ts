import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Permissions, RolePermissionMap, Roles } from "@rbac";

const ownerActor = {
  id: "owner-1",
  permissions: new Set(RolePermissionMap[Roles.PlatformOwner]),
};

const adminActor = {
  id: "admin-1",
  permissions: new Set(RolePermissionMap[Roles.PlatformAdmin]),
};

const findUniqueMock = mock(async () => ({
  id: "user-1",
  role: "USER",
}));

const updateMock = mock(async () => ({
  id: "user-1",
  role: "ADMIN",
  name: "User One",
  email: "user@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  banned: false,
  banReason: null,
  archived: false,
  onboardingComplete: true,
  plan: "free",
  subscriptionStatus: null,
}));

mock.module("@db", () => ({
  default: {
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
      count: async () => 2,
    },
    rbacRole: {
      findUnique: async () => ({ id: "role-admin" }),
    },
    rbacUserRole: {
      deleteMany: async () => ({}),
      create: async () => ({}),
    },
    $transaction: async (actions: unknown[]) => {
      for (const action of actions) {
        if (typeof action === "function") {
          await action();
        }
      }
    },
  },
}));

mock.module("../../src/rbac/policies/sync-user-role.ts", () => ({
  syncLegacyUserRole: async () => {},
}));

mock.module("@/modules/admin/activity/activity.service", () => ({
  activityService: {
    record: async () => {},
  },
}));

describe("users policy rbac integration", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      role: "USER",
    });
    updateMock.mockClear();
  });

  it("prevents admin from granting admin role", async () => {
    const { usersService } = await import(
      "../../src/modules/admin/users/users.service"
    );

    await expect(
      usersService.updateUser("user-1", { role: "ADMIN" }, adminActor),
    ).rejects.toThrow("Only owners can grant admin role");
  });

  it("prevents admin from updating owner accounts", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "owner-target",
      role: "OWNER",
    });

    const { usersService } = await import(
      "../../src/modules/admin/users/users.service"
    );

    await expect(
      usersService.updateUser("owner-target", { name: "Changed" }, adminActor),
    ).rejects.toThrow("Only owners can access owner accounts");
  });

  it("allows owner to grant admin when target is a regular user", async () => {
    const { usersService } = await import(
      "../../src/modules/admin/users/users.service"
    );

    const result = await usersService.updateUser(
      "user-1",
      { role: "ADMIN" },
      ownerActor,
    );

    expect(result.role).toBe("ADMIN");
    expect(ownerActor.permissions.has(Permissions.AdminUsersGrantAdmin)).toBe(
      true,
    );
  });
});
