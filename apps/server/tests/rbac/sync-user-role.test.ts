import { describe, expect, it } from "bun:test";
import { Roles } from "@rbac";
import { legacyRoleToSlug, slugToLegacyRole } from "../../src/rbac/constants";

describe("sync-user-role constants", () => {
  it("maps legacy enum roles to rbac slugs", () => {
    expect(legacyRoleToSlug.OWNER).toBe(Roles.PlatformOwner);
    expect(legacyRoleToSlug.ADMIN).toBe(Roles.PlatformAdmin);
    expect(legacyRoleToSlug.USER).toBe(Roles.PlatformUser);
  });

  it("maps rbac slugs back to legacy enum roles", () => {
    expect(slugToLegacyRole[Roles.PlatformOwner]).toBe("OWNER");
    expect(slugToLegacyRole[Roles.PlatformAdmin]).toBe("ADMIN");
    expect(slugToLegacyRole[Roles.PlatformUser]).toBe("USER");
  });
});
