import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import { ActivityQueryDto } from "./activity.dto";
import { activityService } from "./activity.service";

export const adminActivityController = new Elysia({
  prefix: "/admin/activity",
  detail: {
    tags: ["Admin - Activity"],
  },
})
  .use(adminModuleGuard(Permissions.AdminActivityRead))
  .get(
    "/",
    ({ query }) => activityService.list(query),
    {
      query: ActivityQueryDto,
      detail: {
        summary: "List admin activity events",
      },
    },
  );
