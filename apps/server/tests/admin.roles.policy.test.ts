import { describe, expect, it } from "bun:test";
import {
  Permissions,
  RolePermissionMap,
  Roles,
} from "@rbac";
import {
  assertActorCanGrantPermissions,
  assertRoleCanBeDeleted,
  assertRoleCanBeReset,
  assertRoleIsEditable,
  RolesPolicyError,
} from "@/rbac/policies/roles.policy";

describe("roles.policy", () => {
  it("blocks editing protected owner role", () => {
    expect(() =>
      assertRoleIsEditable({
        slug: Roles.PlatformOwner,
        isProtected: true,
      }),
    ).toThrow(RolesPolicyError);
  });

  it("allows reset only for editable system roles with defaults", () => {
    expect(() =>
      assertRoleCanBeReset({
        slug: Roles.PlatformAdmin,
        isProtected: false,
        isSystem: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertRoleCanBeReset({
        slug: Roles.PlatformOwner,
        isProtected: true,
        isSystem: true,
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertRoleCanBeReset({
        slug: "custom.support",
        isProtected: false,
        isSystem: false,
      }),
    ).toThrow(RolesPolicyError);
  });

  it("blocks deleting roles with user assignments", () => {
    expect(() =>
      assertRoleCanBeDeleted({
        isSystem: false,
        isProtected: false,
        userAssignments: 1,
      }),
    ).toThrow(RolesPolicyError);
  });

  it("blocks non-owners from granting admin grant permission", () => {
    const adminPermissions = new Set(RolePermissionMap[Roles.PlatformAdmin]);

    expect(() =>
      assertActorCanGrantPermissions({
        actorPermissions: adminPermissions,
        permissionNames: [Permissions.AdminUsersGrantAdmin],
      }),
    ).toThrow(RolesPolicyError);

    const ownerPermissions = new Set(RolePermissionMap[Roles.PlatformOwner]);

    expect(() =>
      assertActorCanGrantPermissions({
        actorPermissions: ownerPermissions,
        permissionNames: [Permissions.AdminUsersGrantAdmin],
      }),
    ).not.toThrow();
  });
});
