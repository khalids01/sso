import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Permissions, Roles } from "@sso/rbac";
import { mockRedisModule } from "./helpers/mock-redis-module";

const { store } = mockRedisModule();

describe("user session rbac cache validation", () => {
  beforeEach(() => {
    store.values.clear();
    store.ttl.clear();
  });

  afterEach(() => {
    store.values.clear();
  });

  it("treats legacy payloads without roles as invalid", async () => {
    const { setCachedUserSessionRbac } = await import(
      "@sso/db/server/rbac/cache/effective"
    );
    const { isUserSessionRbacCacheValid } = await import(
      "@sso/db/server/rbac/cache/invalidate"
    );

    await setCachedUserSessionRbac("user-1", {
      permissions: [Permissions.AdminAccess],
      roles: [{ id: "role-user", slug: Roles.PlatformUser, name: "User" }],
      primaryRoleSlug: Roles.PlatformUser,
      primaryRoleId: "role-user",
      catalogVersion: 1,
      computedAt: new Date().toISOString(),
    });

    await expect(isUserSessionRbacCacheValid({
      permissions: [Permissions.AdminAccess],
      catalogVersion: 1,
      computedAt: new Date().toISOString(),
    } as never)).resolves.toBe(false);
  });
});
