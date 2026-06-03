import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Permissions } from "@rbac";
import { mockRedisModule } from "./helpers/mock-redis-module";

const { store } = mockRedisModule();

describe("rbac role permission cache", () => {
  beforeEach(() => {
    store.values.clear();
    store.ttl.clear();
  });

  afterEach(() => {
    store.values.clear();
  });

  it("stores and reads role permissions", async () => {
    const { setCachedRolePermissions, getCachedRolePermissions } = await import(
      "../../src/rbac/cache/role-permissions"
    );

    await setCachedRolePermissions("role-1", [
      Permissions.AdminAccess,
      Permissions.AdminUsersList,
    ]);

    const cached = await getCachedRolePermissions("role-1");
    expect(cached).toEqual([
      Permissions.AdminAccess,
      Permissions.AdminUsersList,
    ]);
  });
});
