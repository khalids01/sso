import { Elysia } from "elysia";
import { getUserSessionRbac } from "@db/rbac/session";
import { toClientSession } from "@auth";
import { authGuard } from "@/guards/auth.guard";

export const sessionController = new Elysia({
  prefix: "/session",
  detail: { tags: ["Session"] },
})
  .use(authGuard)
  .get(
    "/context",
    async ({ session, userId }) => {
      if (!session || !userId) {
        return { user: null, permissions: [], roles: [] };
      }

      const rbac = await getUserSessionRbac(userId);
      const clientSession = toClientSession({
        ...session,
        permissions: rbac.permissions,
        roles: rbac.roles,
        primaryRoleSlug: rbac.primaryRoleSlug,
      });

      if (!clientSession) {
        return { user: null, permissions: [], roles: [] };
      }

      return {
        user: clientSession.user,
        permissions: clientSession.permissions,
        roles: clientSession.roles,
        primaryRoleSlug: clientSession.primaryRoleSlug,
      };
    },
    {
      detail: { summary: "Authenticated session context with permissions" },
    },
  );
