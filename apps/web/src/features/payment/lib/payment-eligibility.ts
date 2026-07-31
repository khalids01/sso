import type { ClientSession } from "@sso/auth/client";
import { Roles } from "@sso/rbac";

export function isBillingEligible(session: ClientSession): boolean {
  return session.primaryRoleSlug === Roles.PlatformUser;
}
