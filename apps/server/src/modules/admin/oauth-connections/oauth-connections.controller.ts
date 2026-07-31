import { Elysia } from "elysia";
import { Permissions } from "@sso/rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import {
  CreateOAuthConnectionDto,
  OAuthConnectionsQueryDto,
  UpdateOAuthConnectionDto,
} from "./oauth-connections.dto";
import {
  oauthConnectionsService,
  OAuthConnectionsPolicyError,
} from "./oauth-connections.service";

function handleError(error: unknown, set: { status?: number | string }) {
  if (error instanceof OAuthConnectionsPolicyError) {
    set.status = error.status;
    return error.message;
  }
  set.status = 400;
  return "OAuth connection operation failed";
}

export const oauthConnectionsController = new Elysia({
  prefix: "/admin/oauth-connections",
  detail: { tags: ["Admin - OAuth Connections"] },
})
  .use(authGuard)
  .guard(
    { beforeHandle: requirePermission(Permissions.AdminAccess) },
    (app) =>
      app
        .get("/", ({ query }) => oauthConnectionsService.list(query), {
          beforeHandle: requirePermission(Permissions.AdminOAuthConnectionsRead),
          query: OAuthConnectionsQueryDto,
        })
        .get("/options", () => oauthConnectionsService.options(), {
          beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
        })
        .post(
          "/",
          async ({ body, set, userId }) => {
            try {
              return await oauthConnectionsService.create(body, { id: userId });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
            body: CreateOAuthConnectionDto,
          },
        )
        .get(
          "/:id",
          async ({ params: { id }, set }) => {
            try {
              return await oauthConnectionsService.getById(id);
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsRead,
            ),
          },
        )
        .get(
          "/:id/secret",
          async ({ params: { id }, set, userId }) => {
            try {
              return await oauthConnectionsService.revealSecret(id, {
                id: userId,
              });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
          },
        )
        .patch(
          "/:id",
          async ({ params: { id }, body, set, userId }) => {
            try {
              return await oauthConnectionsService.update(id, body, {
                id: userId,
              });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
            body: UpdateOAuthConnectionDto,
          },
        )
        .post(
          "/:id/archive",
          async ({ params: { id }, set, userId }) => {
            try {
              return await oauthConnectionsService.archive(id, { id: userId });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
          },
        )
        .post(
          "/:id/restore",
          async ({ params: { id }, set, userId }) => {
            try {
              return await oauthConnectionsService.restore(id, { id: userId });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
          },
        )
        .delete(
          "/:id/permanent",
          async ({ params: { id }, set, userId }) => {
            try {
              return await oauthConnectionsService.deletePermanent(id, {
                id: userId,
              });
            } catch (error) {
              return handleError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(
              Permissions.AdminOAuthConnectionsManage,
            ),
          },
        ),
  );
