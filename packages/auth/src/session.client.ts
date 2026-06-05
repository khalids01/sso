import type {
  AuthClientSession,
  ClientSessionResult,
} from "./session";

export function toClientSession(
  session: AuthClientSession | null | undefined,
): ClientSessionResult {
  if (!session?.user) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      onboardingComplete: session.user.onboardingComplete,
      plan: session.user.plan ?? null,
      subscriptionStatus: session.user.subscriptionStatus ?? null,
    },
    permissions: session.permissions,
    roles: session.roles,
    primaryRoleSlug: session.primaryRoleSlug,
  };
}
