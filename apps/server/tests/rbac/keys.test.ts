import { describe, expect, it } from "bun:test";
import {
  RBAC_CATALOG_VERSION_KEY,
  effectivePermissionsKey,
  rolePermissionsKey,
} from "../../src/rbac/keys";

describe("rbac keys", () => {
  it("builds stable redis keys", () => {
    expect(rolePermissionsKey("role-1")).toBe("rbac:role:role-1:perms");
    expect(effectivePermissionsKey("user-1")).toBe("rbac:effective:user-1");
    expect(RBAC_CATALOG_VERSION_KEY).toBe("rbac:catalog:version");
  });
});
