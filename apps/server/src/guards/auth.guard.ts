import { Elysia } from "elysia";
import { auth } from "@auth";
import type { Permission } from "@rbac";
import {
  createPermissionChecker,
  getEffectivePermissions,
} from "@/rbac/resolve/get-effective";
import { getAccountStatusRejection } from "./account-status";

const emptyPermissions = new Set<Permission>();

export const authGuard = new Elysia()
  .derive({ as: "scoped" }, async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const userId = session?.user?.id;
    const permissions = userId
      ? await getEffectivePermissions(userId)
      : emptyPermissions;

    return {
      session,
      user: session?.user,
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
