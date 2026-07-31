import { describe, expect, it } from "bun:test";
import {
  Permissions,
  RolePermissionMap,
  Roles,
} from "@sso/rbac";
import {
  assertActorCanGrantPermissions,
  assertActorCannotManageOwnRole,
  assertRoleCanBeDeleted,
  assertRoleCanBeReset,
  assertRoleIsEditable,
  assertValidReassignTarget,
  RolesPolicyError,
} from "@/rbac/policies/roles.policy";

describe("roles.policy", () => {
  it("excludes admin.roles permissions from platform.admin defaults", () => {
    for (const permission of RolePermissionMap[Roles.PlatformAdmin]) {
      expect(permission.startsWith("admin.roles.")).toBe(false);
    }
  });

  it("blocks editing protected roles", () => {
    expect(() =>
      assertRoleIsEditable({
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

  it("blocks deleting system or protected roles", () => {
    expect(() =>
      assertRoleCanBeDeleted({
        isSystem: true,
        isProtected: false,
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertRoleCanBeDeleted({
        isSystem: false,
        isProtected: true,
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertRoleCanBeDeleted({
        isSystem: false,
        isProtected: false,
      }),
    ).not.toThrow();
  });

  it("blocks invalid reassignment targets", () => {
    expect(() =>
      assertValidReassignTarget({
        sourceRoleId: "role-custom",
        targetRoleId: "role-custom",
        targetIsProtected: false,
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertValidReassignTarget({
        sourceRoleId: "role-custom",
        targetRoleId: "role-owner",
        targetIsProtected: true,
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertValidReassignTarget({
        sourceRoleId: "role-custom",
        targetRoleId: "role-user",
        targetIsProtected: false,
      }),
    ).not.toThrow();
  });

  it("blocks actors from managing their own assigned role", () => {
    expect(() =>
      assertActorCannotManageOwnRole({
        actorRoleId: "role-admin",
        targetRoleId: "role-admin",
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertActorCannotManageOwnRole({
        actorRoleId: "role-admin",
        targetRoleId: "role-user",
      }),
    ).not.toThrow();
  });

  it("blocks granting permissions the actor does not hold", () => {
    const adminPermissions = new Set(RolePermissionMap[Roles.PlatformAdmin]);

    expect(() =>
      assertActorCanGrantPermissions({
        actorPermissions: adminPermissions,
        permissionNames: [Permissions.AdminUsersGrantAdmin],
      }),
    ).toThrow(RolesPolicyError);

    expect(() =>
      assertActorCanGrantPermissions({
        actorPermissions: adminPermissions,
        permissionNames: [Permissions.AdminAccess],
      }),
    ).not.toThrow();
  });

  it("allows owners to grant any catalog permission they hold", () => {
    const ownerPermissions = new Set(RolePermissionMap[Roles.PlatformOwner]);

    expect(() =>
      assertActorCanGrantPermissions({
        actorPermissions: ownerPermissions,
        permissionNames: [Permissions.AdminUsersGrantAdmin, Permissions.AdminRolesUpdate],
      }),
    ).not.toThrow();
  });
});
