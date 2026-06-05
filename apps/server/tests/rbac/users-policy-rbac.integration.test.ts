import { beforeEach, describe, expect, it, mock } from "bun:test";
import { RolePermissionMap, Roles } from "@rbac";

const ownerActor = {
  id: "owner-1",
  permissions: new Set(RolePermissionMap[Roles.PlatformOwner]),
};

const adminActor = {
  id: "admin-1",
  permissions: new Set(RolePermissionMap[Roles.PlatformAdmin]),
};

const assignUserRoleAndInvalidateMock = mock(async () => undefined);

const findUniqueMock = mock(async () => ({
  id: "user-1",
  rbacRoles: [{ role: { slug: Roles.PlatformUser } }],
}));

const updateMock = mock(async () => ({
  id: "user-1",
  name: "User One",
  email: "user@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  rbacRoles: [{ role: { slug: Roles.PlatformUser, name: "User" } }],
  banned: false,
  banReason: null,
  archived: false,
  onboardingComplete: true,
  plan: "free",
  subscriptionStatus: null,
}));

mock.module("@db/server", () => ({
  default: {
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
    rbacRole: {
      findUnique: async ({ where }: { where: { slug: string } }) => ({
        name: where.slug === Roles.PlatformAdmin ? "Admin" : "User",
      }),
    },
  },
}));

mock.module("@db/server/rbac/roles", () => ({
  isAssignableRoleSlug: async (slug: string) => slug !== Roles.PlatformOwner,
}));

mock.module("@db/server/rbac/assignments", () => ({
  countActivePlatformOwners: async () => 2,
  getRoleIdBySlug: async () => "role-admin-id",
}));

mock.module("../../src/rbac/assignments.ts", () => ({
  assignUserRoleAndInvalidate: assignUserRoleAndInvalidateMock,
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
      rbacRoles: [{ role: { slug: Roles.PlatformUser } }],
    });
    updateMock.mockClear();
    assignUserRoleAndInvalidateMock.mockClear();
  });

  it("prevents admin from granting admin role", async () => {
    const { usersService } = await import(
      "../../src/modules/admin/users/users.service"
    );

    await expect(
      usersService.updateUser(
        "user-1",
        { roleSlug: Roles.PlatformAdmin },
        adminActor,
      ),
    ).rejects.toThrow("Only owners can grant admin role");
    expect(updateMock).not.toHaveBeenCalled();
    expect(assignUserRoleAndInvalidateMock).not.toHaveBeenCalled();
  });

  it("allows owner to grant admin role", async () => {
    const { usersService } = await import(
      "../../src/modules/admin/users/users.service"
    );

    await usersService.updateUser(
      "user-1",
      { roleSlug: Roles.PlatformAdmin },
      ownerActor,
    );

    expect(assignUserRoleAndInvalidateMock).toHaveBeenCalledWith(
      "user-1",
      Roles.PlatformAdmin,
    );
  });
});
