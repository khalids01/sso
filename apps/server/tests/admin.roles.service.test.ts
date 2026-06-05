import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  Permissions,
  RolePermissionMap,
  Roles,
} from "@rbac";
import { mockRedisModule } from "./rbac/helpers/mock-redis-module";

mockRedisModule();

const listRolesMock = mock(async () => []);
const listAssignableRolesMock = mock(async () => []);
const listPermissionCatalogMock = mock(async () => []);
const getRoleByIdMock = mock(async () => null as any);
const createCustomRoleMock = mock(async () => ({
  id: "role-custom",
  slug: "custom.support",
  name: "Support",
  permissions: [Permissions.FeedbackSubmit],
}));
const replaceRolePermissionsMock = mock(async () => [Permissions.FeedbackSubmit]);
const resetRolePermissionsFromMapMock = mock(async () => ({
  roleId: "role-admin",
  permissions: RolePermissionMap[Roles.PlatformAdmin],
}));
const updateCustomRoleMetadataMock = mock(async () => ({
  id: "role-custom",
  slug: "custom.support",
  name: "Support Team",
}));
const deleteCustomRoleMock = mock(async () => ({
  id: "role-custom",
  slug: "custom.support",
  name: "Support",
}));
const getUserIdsForRoleMock = mock(async () => ["user-1"]);
const activityRecordMock = mock(async () => null);

mock.module("@db/server/rbac/roles", () => ({
  listRoles: listRolesMock,
  listAssignableRoles: listAssignableRolesMock,
  listPermissionCatalog: listPermissionCatalogMock,
  getRoleById: getRoleByIdMock,
  createCustomRole: createCustomRoleMock,
  replaceRolePermissions: replaceRolePermissionsMock,
  resetRolePermissionsFromMap: resetRolePermissionsFromMapMock,
  updateCustomRoleMetadata: updateCustomRoleMetadataMock,
  deleteCustomRole: deleteCustomRoleMock,
  getUserIdsForRole: getUserIdsForRoleMock,
  isAssignableRoleSlug: mock(async () => true),
}));

mock.module("../src/modules/admin/activity/activity.service", () => ({
  activityService: {
    record: activityRecordMock,
  },
}));

const ownerActor = {
  id: "owner-1",
  permissions: new Set(RolePermissionMap[Roles.PlatformOwner]),
};

describe("roles.service", () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    listRolesMock.mockClear();
    getRoleByIdMock.mockClear();
    replaceRolePermissionsMock.mockClear();
    resetRolePermissionsFromMapMock.mockClear();
    activityRecordMock.mockClear();
  });

  it("updates role permissions and refreshes cache", async () => {
    getRoleByIdMock.mockResolvedValueOnce({
      id: "role-admin",
      slug: Roles.PlatformAdmin,
      name: "Admin",
      isProtected: false,
      isSystem: true,
      permissions: RolePermissionMap[Roles.PlatformAdmin],
      _count: { permissions: 10, userAssignments: 2 },
    });
    getRoleByIdMock.mockResolvedValueOnce({
      id: "role-admin",
      slug: Roles.PlatformAdmin,
      name: "Admin",
      isProtected: false,
      isSystem: true,
      permissions: [Permissions.FeedbackSubmit],
      _count: { permissions: 1, userAssignments: 2 },
    });
    listPermissionCatalogMock.mockResolvedValueOnce(
      Object.values(Permissions).map((name) => ({
        id: `perm-${name}`,
        name,
        group: name.split(".").slice(0, -1).join("."),
        description: null,
        isSystem: true,
      })),
    );

    const { rolesService } = await import("../src/modules/admin/roles/roles.service");
    const { getCachedRolePermissions } = await import(
      "../src/rbac/cache/role-permissions"
    );

    await rolesService.updateRolePermissions(
      "role-admin",
      [Permissions.FeedbackSubmit],
      ownerActor,
    );

    expect(replaceRolePermissionsMock).toHaveBeenCalledWith("role-admin", [
      Permissions.FeedbackSubmit,
    ]);
    expect(await getCachedRolePermissions("role-admin")).toEqual([
      Permissions.FeedbackSubmit,
    ]);
    expect(activityRecordMock).toHaveBeenCalled();
  });

  it("resets system role permissions from map", async () => {
    getRoleByIdMock.mockResolvedValueOnce({
      id: "role-admin",
      slug: Roles.PlatformAdmin,
      name: "Admin",
      isProtected: false,
      isSystem: true,
      permissions: [Permissions.FeedbackSubmit],
      _count: { permissions: 1, userAssignments: 0 },
    });
    getRoleByIdMock.mockResolvedValueOnce({
      id: "role-admin",
      slug: Roles.PlatformAdmin,
      name: "Admin",
      isProtected: false,
      isSystem: true,
      permissions: RolePermissionMap[Roles.PlatformAdmin],
      _count: {
        permissions: RolePermissionMap[Roles.PlatformAdmin].length,
        userAssignments: 0,
      },
    });

    const { rolesService } = await import("../src/modules/admin/roles/roles.service");

    await rolesService.resetRole("role-admin", ownerActor);

    expect(resetRolePermissionsFromMapMock).toHaveBeenCalledWith(Roles.PlatformAdmin);
    expect(activityRecordMock).toHaveBeenCalled();
  });

  it("rejects permission updates for protected owner role", async () => {
    getRoleByIdMock.mockResolvedValueOnce({
      id: "role-owner",
      slug: Roles.PlatformOwner,
      name: "Owner",
      isProtected: true,
      isSystem: true,
      permissions: RolePermissionMap[Roles.PlatformOwner],
      _count: { permissions: 20, userAssignments: 1 },
    });

    const { rolesService, RolesPolicyError } = await import(
      "../src/modules/admin/roles/roles.service"
    );

    await expect(
      rolesService.updateRolePermissions(
        "role-owner",
        [Permissions.AdminAccess],
        ownerActor,
      ),
    ).rejects.toBeInstanceOf(RolesPolicyError);
  });
});
