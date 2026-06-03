import { describe, expect, it } from "bun:test";
import {
  Permissions,
  applyOverrides,
  buildEffectiveSet,
  flattenRolePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "@rbac";

describe("rbac check", () => {
  it("flattens multiple roles without duplicates", () => {
    const result = flattenRolePermissions([
      [Permissions.FeedbackSubmit],
      [Permissions.FeedbackSubmit, Permissions.AdminAccess],
    ]);

    expect(result.size).toBe(2);
    expect(result.has(Permissions.FeedbackSubmit)).toBe(true);
    expect(result.has(Permissions.AdminAccess)).toBe(true);
  });

  it("applies deny overrides after grants", () => {
    const base = new Set([Permissions.AdminAccess, Permissions.AdminUsersList]);

    const result = applyOverrides(base, [
      { permission: Permissions.AdminUsersList, effect: "deny" },
      { permission: Permissions.FeedbackSubmit, effect: "grant" },
    ]);

    expect(result.has(Permissions.AdminAccess)).toBe(true);
    expect(result.has(Permissions.AdminUsersList)).toBe(false);
    expect(result.has(Permissions.FeedbackSubmit)).toBe(true);
  });

  it("deny wins when grant and deny target the same permission", () => {
    const result = buildEffectiveSet({
      rolePermissionSets: [[Permissions.AdminUsersBan]],
      overrides: [
        { permission: Permissions.AdminUsersBan, effect: "grant" },
        { permission: Permissions.AdminUsersBan, effect: "deny" },
      ],
    });

    expect(result.has(Permissions.AdminUsersBan)).toBe(false);
  });

  it("returns empty set when no roles are assigned", () => {
    const result = buildEffectiveSet({ rolePermissionSets: [] });
    expect(result.size).toBe(0);
  });

  it("checks hasPermission, hasAny, and hasAll", () => {
    const permissions = buildEffectiveSet({
      rolePermissionSets: [[Permissions.AdminAccess, Permissions.AdminUsersList]],
    });

    expect(hasPermission(permissions, Permissions.AdminAccess)).toBe(true);
    expect(hasPermission(permissions, Permissions.AdminUsersDelete)).toBe(
      false,
    );
    expect(
      hasAnyPermission(permissions, [
        Permissions.AdminUsersDelete,
        Permissions.AdminUsersList,
      ]),
    ).toBe(true);
    expect(
      hasAllPermissions(permissions, [
        Permissions.AdminAccess,
        Permissions.AdminUsersList,
      ]),
    ).toBe(true);
  });
});
