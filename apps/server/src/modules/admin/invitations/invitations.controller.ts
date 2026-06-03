import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import { adminInvitationsService } from "./invitations.service";
import { AdminInvitationQueryDto } from "./invitations.dto";

export const adminInvitationsController = new Elysia({
  prefix: "/admin/invitations",
  detail: {
    tags: ["Admin - Invitations"],
  },
})
  .use(adminModuleGuard(Permissions.AdminInvitationsManage))
  .get(
    "/",
    async ({ query }) => adminInvitationsService.listInvitations(query),
    {
      query: AdminInvitationQueryDto,
      detail: {
        summary: "List invitations grouped by invited email",
      },
    },
  );
