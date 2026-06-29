import { Elysia } from "elysia";
import { toClientSession } from "@auth/client";
import { authGuard } from "@/guards/auth.guard";

export const sessionController = new Elysia({
  prefix: "/session",
  detail: { tags: ["Session"] },
})
  .use(authGuard)
  .get(
    "/context",
    async ({ session, userId, set }) => {
      set.headers["cache-control"] = "private, no-store";

      if (!session || !userId) {
        return { user: null, permissions: [], roles: [], primaryRoleSlug: null, primaryRoleId: null };
      }

      const clientSession = toClientSession(session);

      if (!clientSession) {
        return { user: null, permissions: [], roles: [], primaryRoleSlug: null, primaryRoleId: null };
      }

      return {
        user: clientSession.user,
        permissions: clientSession.permissions,
        roles: clientSession.roles,
        primaryRoleSlug: clientSession.primaryRoleSlug,
        primaryRoleId: clientSession.primaryRoleId,
      };
    },
    {
      detail: { summary: "Authenticated session context with permissions" },
    },
  )
  .get(
    "/devices",
    async ({ session, userId, set }) => {
      set.headers["cache-control"] = "private, no-store";

      if (!session || !userId) {
        set.status = 401;
        return "Unauthorized";
      }

      const { listUserSessionDevices } = await import(
        "../../../../../packages/db/src/session-revocation.server"
      );
      return listUserSessionDevices(userId, session.session.id);
    },
    {
      detail: { summary: "Current user's logged-in devices" },
    },
  )
  .delete(
    "/devices/:sessionId",
    async ({ params: { sessionId }, session, userId, set }) => {
      if (!session || !userId) {
        set.status = 401;
        return "Unauthorized";
      }

      try {
        const { revokeUserSessionDevice } = await import(
          "../../../../../packages/db/src/session-revocation.server"
        );
        return await revokeUserSessionDevice(
          userId,
          sessionId,
          session.session.id,
        );
      } catch (error) {
        set.status = 400;
        return error instanceof Error ? error.message : "Failed to log out device";
      }
    },
    {
      detail: { summary: "Log out one other device" },
    },
  )
  .delete(
    "/devices/others",
    async ({ session, userId, set }) => {
      if (!session || !userId) {
        set.status = 401;
        return "Unauthorized";
      }

      const { revokeUserSessionsExcept } = await import(
        "../../../../../packages/db/src/session-revocation.server"
      );
      return revokeUserSessionsExcept(userId, session.session.id);
    },
    {
      detail: { summary: "Log out all other devices" },
    },
  );
