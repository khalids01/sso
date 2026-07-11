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
  ClientsQueryDto,
  CreateApplicationClientDto,
  CreateApplicationDto,
  UpdateApplicationClientDto,
  UpdateApplicationDto,
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
        .patch(
          "/:id",
          async ({ params: { id }, body, set, userId }) => {
            try {
              return await adminApplicationsService.update(
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
            body: UpdateApplicationDto,
            detail: {
              summary: "Update an application",
            },
          },
        )
        .post(
          "/:id/archive",
          async ({ params: { id }, set, userId }) => {
            try {
              return await adminApplicationsService.archive(
                id,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Archive an application",
            },
          },
        )
        .post(
          "/:id/restore",
          async ({ params: { id }, set, userId }) => {
            try {
              return await adminApplicationsService.restore(
                id,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Restore an application",
            },
          },
        )
        .delete(
          "/:id",
          async ({ params: { id }, set, userId }) => {
            try {
              return await adminApplicationsService.deletePermanent(
                id,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Permanently delete an archived application",
            },
          },
        )
        .get(
          "/:id/clients",
          ({ params: { id }, query }) =>
            adminApplicationsService.listClients(id, query),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            query: ClientsQueryDto,
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
        )
        .patch(
          "/:id/clients/:clientId",
          async ({ params: { id, clientId }, body, set, userId }) => {
            try {
              return await adminApplicationsService.updateClient(
                id,
                clientId,
                body,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            body: UpdateApplicationClientDto,
            detail: {
              summary: "Update an application client",
            },
          },
        )
        .post(
          "/:id/clients/:clientId/archive",
          async ({ params: { id, clientId }, set, userId }) => {
            try {
              return await adminApplicationsService.archiveClient(
                id,
                clientId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Archive an application client",
            },
          },
        )
        .post(
          "/:id/clients/:clientId/restore",
          async ({ params: { id, clientId }, set, userId }) => {
            try {
              return await adminApplicationsService.restoreClient(
                id,
                clientId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Restore an application client",
            },
          },
        )
        .delete(
          "/:id/clients/:clientId",
          async ({ params: { id, clientId }, set, userId }) => {
            try {
              return await adminApplicationsService.deleteClientPermanent(
                id,
                clientId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Permanently delete an archived application client",
            },
          },
        ),
  );
