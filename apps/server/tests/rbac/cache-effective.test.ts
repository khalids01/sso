import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Permissions } from "@rbac";
import { mockRedisModule } from "./helpers/mock-redis-module";

const { store } = mockRedisModule();

describe("rbac effective cache", () => {
  beforeEach(() => {
    store.values.clear();
    store.ttl.clear();
  });

  afterEach(() => {
    store.values.clear();
  });

  it("writes and reads effective permissions payload", async () => {
    const {
      setCachedEffectivePermissions,
      getCachedEffectivePermissions,
      deleteCachedEffectivePermissions,
    } = await import("../../src/rbac/cache/effective");

    await setCachedEffectivePermissions("user-1", {
      permissions: [Permissions.AdminAccess],
      catalogVersion: 1,
      computedAt: new Date().toISOString(),
    });

    const cached = await getCachedEffectivePermissions("user-1");
    expect(cached?.permissions).toEqual([Permissions.AdminAccess]);

    await deleteCachedEffectivePermissions("user-1");
    const afterDelete = await getCachedEffectivePermissions("user-1");
    expect(afterDelete).toBeNull();
  });
});
