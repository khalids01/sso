import { Elysia } from "elysia";
import { auth } from "@auth/server";
import { InvitationParamsDto } from "./invitations.dto";
import { invitationsService } from "./invitations.service";

export const invitationsController = new Elysia({
  prefix: "/invitations",
  detail: {
    tags: ["Invitations"],
  },
})
  .get(
    "/:id",
    async ({ params, set }) => {
      const result = await invitationsService.getInvitationById(params.id);

      if ("code" in result) {
        set.status = result.status;
        return {
          code: result.code,
          message: result.message,
        };
      }

      return result;
    },
    {
      params: InvitationParamsDto,
      detail: {
        summary: "Get invitation details by id",
      },
    },
  )
  .post(
    "/:id/accept",
    async ({ params, request, set }) => {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id || !session.user.email) {
        set.status = 401;
        return {
          code: "UNAUTHORIZED",
          message: "You must be signed in to accept an invitation.",
        };
      }

      const result = await invitationsService.acceptInvitation({
        invitationId: params.id,
        userId: session.user.id,
        userEmail: session.user.email,
      });

      if (!result.success) {
        set.status = result.error.status;
        return {
          code: result.error.code,
          message: result.error.message,
        };
      }

      return {
        success: true,
        redirectTo: result.data.redirectTo,
      };
    },
    {
      params: InvitationParamsDto,
      detail: {
        summary: "Accept an invitation",
      },
    },
  );
