import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import { feedbackService } from "./feedback.service";
import {
  SubmitFeedbackDto,
  UpdateFeedbackStatusDto,
  FeedbackQueryDto,
} from "./feedback.dto";

export const feedbackController = new Elysia({
  prefix: "/feedback",
  detail: { tags: ["Feedback"] },
})
  .use(authGuard)
  .post(
    "/",
    async (ctx) => {
      const { body, userId } = ctx as typeof ctx & { userId?: string };
      const feedback = await feedbackService.submitFeedback(
        userId!,
        body.message,
        body.severity,
      );
      return { success: true, feedback };
    },
    {
      beforeHandle: requirePermission(Permissions.FeedbackSubmit),
      body: SubmitFeedbackDto,
      detail: { summary: "Submit feedback or bug report" },
    },
  )
  .get(
    "/all",
    async ({ query }) => feedbackService.getAllFeedback(query),
    {
      beforeHandle: requirePermission(Permissions.FeedbackModerate),
      query: FeedbackQueryDto,
      detail: { summary: "Get all feedback (Admin only)" },
    },
  )
  .patch(
    "/:id/status",
    async ({ params: { id }, body, userId }) => {
      const feedback = await feedbackService.updateFeedbackStatus(
        id,
        body.status,
        userId,
      );
      return { success: true, feedback };
    },
    {
      beforeHandle: requirePermission(Permissions.FeedbackModerate),
      body: UpdateFeedbackStatusDto,
      detail: { summary: "Update feedback status (Admin only)" },
    },
  );
