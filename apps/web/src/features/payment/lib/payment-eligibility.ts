import type { ClientSession } from "@auth/client";
import { Roles } from "@rbac";

export function isBillingEligible(session: ClientSession): boolean {
  return session.primaryRoleSlug === Roles.PlatformUser;
}
