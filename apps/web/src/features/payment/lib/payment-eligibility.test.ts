import { describe, expect, it } from "bun:test";
import { Roles, type RoleSlug } from "@rbac";

import { isBillingEligible } from "./payment-eligibility";

function sessionWithRole(primaryRoleSlug: RoleSlug) {
  return { primaryRoleSlug } as Parameters<typeof isBillingEligible>[0];
}

describe("isBillingEligible", () => {
  it("allows platform users to load billing state", () => {
    expect(isBillingEligible(sessionWithRole(Roles.PlatformUser))).toBe(true);
  });

  it("does not treat admins or owners as billing users", () => {
    expect(isBillingEligible(sessionWithRole(Roles.PlatformAdmin))).toBe(false);
    expect(isBillingEligible(sessionWithRole(Roles.PlatformOwner))).toBe(false);
  });
});
