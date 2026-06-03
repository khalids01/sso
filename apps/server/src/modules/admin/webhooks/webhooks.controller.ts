import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import { WebhookEventsQueryDto } from "./webhooks.dto";
import { adminWebhooksService } from "./webhooks.service";

export const adminWebhooksController = new Elysia({
  prefix: "/admin/webhooks",
  detail: {
    tags: ["Admin - Webhooks"],
  },
})
  .use(adminModuleGuard(Permissions.AdminWebhooksRead))
  .get(
    "/",
    ({ query }) => adminWebhooksService.list(query),
    {
      query: WebhookEventsQueryDto,
      detail: {
        summary: "List webhook delivery events",
      },
    },
  );
