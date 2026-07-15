import { describe, expect, it } from "bun:test";
import { Roles } from "../../../packages/rbac/src/index";
import { resolveActorRole } from "../helpers/actor-role";

describe("E2E actor role aliases", () => {
  it("maps friendly aliases to platform role slugs", () => {
    expect(resolveActorRole("owner")).toBe(Roles.PlatformOwner);
    expect(resolveActorRole("admin")).toBe(Roles.PlatformAdmin);
    expect(resolveActorRole("user")).toBe(Roles.PlatformUser);
  });

  it("accepts exact platform role slugs", () => {
    expect(resolveActorRole(Roles.PlatformAdmin)).toBe(Roles.PlatformAdmin);
  });

  it("rejects unknown roles", () => {
    expect(() => resolveActorRole("super-admin")).toThrow("Unsupported E2E actor role");
  });
});
