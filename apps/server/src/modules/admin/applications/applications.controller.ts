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
  ApplicationMembersQueryDto,
  ApplicationsQueryDto,
  ClientsQueryDto,
  CreateApplicationClientDto,
  CreateApplicationMemberDto,
  CreateApplicationDto,
  RevocationDeliveriesQueryDto,
  UpdateApplicationClientDto,
  UpdateApplicationDto,
  UpdateRevocationEndpointDto,
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
          "/:id",
          async ({ params: { id }, set }) => {
            try {
              return await adminApplicationsService.getById(id);
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            detail: {
              summary: "Get an application",
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
          "/:id/members",
          ({ params: { id }, query }) =>
            adminApplicationsService.listMembers(id, query),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            query: ApplicationMembersQueryDto,
            detail: {
              summary: "List application members",
            },
          },
        )
        .post(
          "/:id/members",
          async ({ params: { id }, body, set, userId }) => {
            try {
              return await adminApplicationsService.grantMember(
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
            body: CreateApplicationMemberDto,
            detail: {
              summary: "Grant application access to a user",
            },
          },
        )
        .post(
          "/:id/members/:memberId/suspend",
          async ({ params: { id, memberId }, set, userId }) => {
            try {
              return await adminApplicationsService.suspendMember(
                id,
                memberId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Suspend application access",
            },
          },
        )
        .post(
          "/:id/members/:memberId/restore",
          async ({ params: { id, memberId }, set, userId }) => {
            try {
              return await adminApplicationsService.restoreMember(
                id,
                memberId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Restore application access",
            },
          },
        )
        .post(
          "/:id/members/:memberId/revoke",
          async ({ params: { id, memberId }, set, userId }) => {
            try {
              return await adminApplicationsService.revokeMember(
                id,
                memberId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Revoke application access",
            },
          },
        )
        .delete(
          "/:id/members/:memberId",
          async ({ params: { id, memberId }, set, userId }) => {
            try {
              return await adminApplicationsService.deleteMemberPermanent(
                id,
                memberId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: {
              summary: "Permanently delete a revoked application membership",
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
        )
        .get(
          "/:id/revocation",
          ({ params: { id } }) =>
            adminApplicationsService.getRevocationEndpoint(id),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            detail: { summary: "Get the application revocation endpoint" },
          },
        )
        .put(
          "/:id/revocation",
          async ({ params: { id }, body, set, userId }) => {
            try {
              return await adminApplicationsService.updateRevocationEndpoint(
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
            body: UpdateRevocationEndpointDto,
            detail: { summary: "Configure the application revocation endpoint" },
          },
        )
        .get(
          "/:id/revocation/deliveries",
          ({ params: { id }, query }) =>
            adminApplicationsService.listRevocationDeliveries(id, query.limit),
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
            query: RevocationDeliveriesQueryDto,
            detail: { summary: "List application revocation deliveries" },
          },
        )
        .post(
          "/:id/revocation/deliveries/:deliveryId/retry",
          async ({ params: { id, deliveryId }, set, userId }) => {
            try {
              return await adminApplicationsService.retryRevocationDelivery(
                id,
                deliveryId,
                getActor({ userId }),
              );
            } catch (error) {
              return handleApplicationsMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminApplicationsManage),
            detail: { summary: "Retry a dead-lettered revocation delivery" },
          },
        ),
  );
