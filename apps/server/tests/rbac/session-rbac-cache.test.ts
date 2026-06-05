import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Permissions, Roles } from "@rbac";
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
      "@db/server/rbac/cache/effective"
    );
    const { isUserSessionRbacCacheValid } = await import(
      "@db/server/rbac/cache/invalidate"
    );

    await setCachedUserSessionRbac("user-1", {
      permissions: [Permissions.AdminAccess],
      roles: [],
      primaryRoleSlug: Roles.PlatformUser,
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
