import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import {
  adminApplicationsService,
  ApplicationsPolicyError,
  type AdminApplicationsActor,
} from "./applications.service";
import {
  ApplicationsQueryDto,
  CreateApplicationClientDto,
  CreateApplicationDto,
} from "./applications.dto";

function getActor(ctx: { userId?: string }): AdminApplicationsActor {
  return {
    id: ctx.userId,
  };
}

function handleApplicationsMutationError(
  error: unknown,
  set: { status?: number | string },
) {
  if (error instanceof ApplicationsPolicyError) {
    set.status = error.status;
    return error.message;
  }

  set.status = 400;
  return error instanceof Error ? error.message : "Application operation failed";
}

export const applicationsController = new Elysia({
  prefix: "/admin/applications",
  detail: {
    tags: ["Admin - Applications"],
  },
})
  .use(authGuard)
  .guard(
    {
      beforeHandle: requirePermission(Permissions.AdminAccess),
    },
    (app) =>
      app
        .get(
          "/",
          ({ query }) => adminApplicationsService.list(query),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            query: ApplicationsQueryDto,
            detail: {
              summary: "List registered applications",
            },
          },
        )
        .post(
          "/",
          async ({ body, set, userId }) => {
            try {
              return await adminApplicationsService.create(
                body,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            body: CreateApplicationDto,
            detail: {
              summary: "Create an application",
            },
          },
        )
        .get(
          "/:id/clients",
          ({ params: { id } }) => adminApplicationsService.listClients(id),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            detail: {
              summary: "List application clients",
            },
          },
        )
        .post(
          "/:id/clients",
          async ({ params: { id }, body, set, userId }) => {
            try {
              return await adminApplicationsService.createClient(
                id,
                body,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            body: CreateApplicationClientDto,
            detail: {
              summary: "Create an application client",
            },
          },
        ),
  );
