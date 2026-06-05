import { Roles, type Permission, type RoleSlug, type SessionRoleSummary } from "@rbac";
import type { AuthClientSession } from "@/lib/auth-client";
import type { ClientSession } from "@/features/user/lib/client-session";

type EnrichedAuthSession = AuthClientSession & {
  user: NonNullable<AuthClientSession["user"]>;
  permissions?: Permission[];
  roles?: SessionRoleSummary[];
  primaryRoleSlug?: RoleSlug;
};

export function toClientSession(
  session: AuthClientSession | null | undefined,
): ClientSession {
  if (!session?.user) {
    return null;
  }

  const enriched = session as EnrichedAuthSession;
  const user = enriched.user;

  return {
    user: {
      id: String(user.id ?? ""),
      name: String(user.name ?? ""),
      email: String(user.email ?? ""),
      onboardingComplete: Boolean(user.onboardingComplete),
      plan: typeof user.plan === "string" ? user.plan : null,
      subscriptionStatus:
        typeof user.subscriptionStatus === "string"
          ? user.subscriptionStatus
          : null,
    },
    permissions: Array.isArray(enriched.permissions) ? enriched.permissions : [],
    roles: Array.isArray(enriched.roles) ? enriched.roles : [],
    primaryRoleSlug: enriched.primaryRoleSlug ?? Roles.PlatformUser,
  };
}
