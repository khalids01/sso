import { describe, expect, it } from "bun:test";
import { Permissions, RolePermissionMap, Roles } from "@rbac";
import {
  createTestGraph,
  expectedPermissionsForUser,
} from "./helpers/fixtures";

describe("rbac build-effective fixtures", () => {
  it("owner graph includes every catalog permission", () => {
    const graph = createTestGraph({
      users: {
        owner: { roleSlugs: [Roles.PlatformOwner] },
      },
    });

    const expected = expectedPermissionsForUser(graph, "owner");
    for (const permission of RolePermissionMap[Roles.PlatformOwner]) {
      expect(expected.has(permission)).toBe(true);
    }
    expect(expected.has(Permissions.AdminUsersGrantAdmin)).toBe(true);
  });

  it("admin graph excludes grant_admin but keeps admin access", () => {
    const graph = createTestGraph({
      users: {
        admin: { roleSlugs: [Roles.PlatformAdmin] },
      },
    });

    const expected = expectedPermissionsForUser(graph, "admin");
    expect(expected.has(Permissions.AdminAccess)).toBe(true);
    expect(expected.has(Permissions.AdminUsersGrantAdmin)).toBe(false);
    expect(expected.has(Permissions.AdminUsersList)).toBe(true);
  });

  it("user overrides can remove feedback submit", () => {
    const graph = createTestGraph({
      users: {
        user: {
          roleSlugs: [Roles.PlatformUser],
          overrides: [
            { permission: Permissions.FeedbackSubmit, effect: "deny" },
          ],
        },
      },
    });

    const expected = expectedPermissionsForUser(graph, "user");
    expect(expected.has(Permissions.FeedbackSubmit)).toBe(false);
    expect(expected.has(Permissions.NotificationsUse)).toBe(true);
  });
});
