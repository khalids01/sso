import { Elysia } from "elysia";
import { Permissions } from "@sso/rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import {
  ApplicationUsageEventsQueryDto,
  ApplicationUsageOverviewQueryDto,
} from "./application-usage.dto";
import { adminApplicationUsageService } from "./application-usage.service";

export const adminApplicationUsageController = new Elysia({
  prefix: "/admin/application-usage",
  detail: { tags: ["Admin - Application Usage"] },
})
  .use(adminModuleGuard(Permissions.AdminApplicationUsageRead))
  .get(
    "/overview",
    ({ query }) => adminApplicationUsageService.getOverview(query),
    {
      query: ApplicationUsageOverviewQueryDto,
      detail: { summary: "Get application usage metrics and trend" },
    },
  )
  .get(
    "/events",
    ({ query }) => adminApplicationUsageService.listEvents(query),
    {
      query: ApplicationUsageEventsQueryDto,
      detail: { summary: "List application usage events" },
    },
  );
