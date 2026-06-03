import { describe, expect, it } from "bun:test";
import { Permissions, RolePermissionMap, Roles } from "@rbac";
import {
  assertActorCanAccessOwnerTarget,
  assertActorCanChangePrivilegedAccounts,
  assertActorCanGrantAdminRole,
  assertNotSelfTarget,
  filterOwnerUsers,
} from "../../src/rbac/policies/owner.policy";

const ownerPermissions = new Set(RolePermissionMap[Roles.PlatformOwner]);
const adminPermissions = new Set(RolePermissionMap[Roles.PlatformAdmin]);

describe("owner policy", () => {
  it("blocks admin from targeting owner accounts", () => {
    expect(() =>
      assertActorCanAccessOwnerTarget({
        actorPermissions: adminPermissions,
        targetRole: "OWNER",
      }),
    ).toThrow("Only owners can access owner accounts");
  });

  it("allows owner to target owner accounts", () => {
    expect(() =>
      assertActorCanAccessOwnerTarget({
        actorPermissions: ownerPermissions,
        targetRole: "OWNER",
      }),
    ).not.toThrow();
  });

  it("blocks admin from granting admin role", () => {
    expect(() =>
      assertActorCanGrantAdminRole({
        actorPermissions: adminPermissions,
        nextRole: "ADMIN",
      }),
    ).toThrow("Only owners can grant admin role");
  });

  it("blocks self destructive actions", () => {
    expect(() =>
      assertNotSelfTarget({
        actorId: "user-1",
        targetId: "user-1",
        action: "ban",
      }),
    ).toThrow("You cannot ban your own account");
  });

  it("filters owner users from admin list views", () => {
    const users = [
      { id: "1", role: "USER" },
      { id: "2", role: "OWNER" },
    ];

    const filtered = filterOwnerUsers(users, adminPermissions);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.role).toBe("USER");
  });

  it("blocks admin from changing privileged accounts", () => {
    expect(() =>
      assertActorCanChangePrivilegedAccounts({
        actorPermissions: adminPermissions,
        targetRole: "ADMIN",
      }),
    ).toThrow("Only owners can change admin or owner accounts");
  });

  it("owner permissions include grant_admin capability", () => {
    expect(ownerPermissions.has(Permissions.AdminUsersGrantAdmin)).toBe(true);
  });
});
