import { beforeEach, describe, expect, it } from "bun:test";
import { mockRedisModule } from "./helpers/mock-redis-module";

const { store } = mockRedisModule();

describe("rbac invalidate", () => {
  beforeEach(() => {
    store.values.clear();
    store.ttl.clear();
  });

  it("deletes user effective cache", async () => {
    const { invalidateUser } = await import("../../src/rbac/cache/invalidate");
    const { setCachedEffectivePermissions } = await import(
      "../../src/rbac/cache/effective"
    );

    await setCachedEffectivePermissions("user-1", {
      permissions: [],
      catalogVersion: 1,
      computedAt: new Date().toISOString(),
    });

    await invalidateUser("user-1");

    const { getCachedEffectivePermissions } = await import(
      "../../src/rbac/cache/effective"
    );
    const cached = await getCachedEffectivePermissions("user-1");
    expect(cached).toBeNull();
  });

  it("bumps catalog version", async () => {
    const { getCatalogVersion, bumpCatalogVersion } = await import(
      "../../src/rbac/cache/invalidate"
    );

    const initial = await getCatalogVersion();
    await bumpCatalogVersion();
    const next = await getCatalogVersion();
    expect(next).toBe(initial + 1);
  });
});
