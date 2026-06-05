import type { Permission, RoleSlug, SessionRoleSummary } from "@rbac";

import { auth } from "./auth-instance";

export type AuthGetSessionResult = Awaited<
  ReturnType<typeof auth.api.getSession>
>;

export type AuthSessionData = NonNullable<AuthGetSessionResult>;

export type AuthUser = AuthSessionData["user"];

export type AuthSessionRecord = AuthSessionData["session"];

export type AuthClientSession = AuthSessionData;

export type ClientSessionUser = Pick<
  AuthUser,
  "id" | "name" | "email" | "onboardingComplete" | "plan" | "subscriptionStatus"
>;

export type ClientSession = {
  user: ClientSessionUser;
  permissions: Permission[];
  roles: SessionRoleSummary[];
  primaryRoleSlug: RoleSlug;
};

export type ClientSessionResult = ClientSession | null;

export async function getAuthSession(
  headers: Headers,
): Promise<AuthGetSessionResult> {
  return auth.api.getSession({ headers });
}

export function toClientSession(
  session: AuthGetSessionResult,
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
