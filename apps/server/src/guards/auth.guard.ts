import { Elysia } from "elysia";
import type { Permission } from "@rbac";
import {
  getAuthSession,
  type AuthGetSessionResult,
  type AuthSessionData,
  type AuthUser,
} from "@auth";
import {
  createPermissionChecker,
  getEffectivePermissions,
} from "@/rbac/resolve/get-effective";
import { getAccountStatusRejection } from "./account-status";

const emptyPermissions = new Set<Permission>();

function getPermissionsFromSession(
  session: AuthGetSessionResult,
): ReadonlySet<Permission> | null {
  if (!session) {
    return null;
  }

  return new Set(session.permissions);
}

export type AuthGuardContext = {
  session: AuthGetSessionResult;
  user: AuthUser | undefined;
  userId: string | undefined;
  permissions: ReadonlySet<Permission>;
  hasPermission: ReturnType<typeof createPermissionChecker>;
};

export const authGuard = new Elysia()
  .derive({ as: "scoped" }, async ({ request }): Promise<AuthGuardContext> => {
    const session: AuthGetSessionResult = await getAuthSession(request.headers);

    const userId = session?.user.id;
    const permissions =
      getPermissionsFromSession(session) ??
      (userId
        ? await getEffectivePermissions(userId)
        : emptyPermissions);

    const user: AuthUser | undefined = session?.user;

    return {
      session,
      user,
      userId,
      permissions,
      hasPermission: createPermissionChecker(permissions),
    };
  })
  .onBeforeHandle({ as: "scoped" }, ({ session, set }) => {
    const rejection = getAccountStatusRejection(session?.user);
    if (!rejection) {
      return;
    }

    set.status = rejection.status;
    return rejection;
  });

export function requireAuthSession(
  session: AuthGetSessionResult,
): AuthSessionData {
  if (!session) {
    throw new Error("Authentication required");
  }

  return session;
}
