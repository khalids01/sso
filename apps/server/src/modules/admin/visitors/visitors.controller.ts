import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import {
  VisitorsListQueryDto,
  VisitorsOverviewQueryDto,
} from "./visitors.dto";
import { adminVisitorsService } from "./visitors.service";

export const adminVisitorsController = new Elysia({
  prefix: "/admin/visitors",
  detail: {
    tags: ["Admin - Visitors"],
  },
})
  .use(adminModuleGuard(Permissions.AdminVisitorsRead))
  .get(
    "/overview",
    ({ query }) => adminVisitorsService.getOverview(query),
    {
      query: VisitorsOverviewQueryDto,
      detail: {
        summary: "Get visitors overview stats and time series",
      },
    },
  )
  .get(
    "/",
    ({ query }) => adminVisitorsService.list(query),
    {
      query: VisitorsListQueryDto,
      detail: {
        summary: "List visitor sessions",
      },
    },
  );
