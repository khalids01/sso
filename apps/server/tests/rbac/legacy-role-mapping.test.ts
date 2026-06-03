import { describe, expect, it } from "bun:test";
import { RolePermissionMap, Roles } from "@rbac";
import { legacyRoleToSlug } from "../../src/rbac/constants";

describe("legacy role mapping", () => {
  it("maps ADMIN enum to platform.admin default permissions", () => {
    const slug = legacyRoleToSlug.ADMIN;
    expect(slug).toBe(Roles.PlatformAdmin);
    expect(RolePermissionMap[slug]).toContain("admin.access");
    expect(RolePermissionMap[slug]).not.toContain("admin.users.grant_admin");
  });

  it("maps OWNER enum to full permission catalog", () => {
    const slug = legacyRoleToSlug.OWNER;
    expect(slug).toBe(Roles.PlatformOwner);
    expect(RolePermissionMap[slug].length).toBeGreaterThan(
      RolePermissionMap[Roles.PlatformAdmin].length,
    );
  });
});
