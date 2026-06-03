import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin/admin-rbac.plugin";
import {
  RateLimitOverviewDto,
  UpdateRateLimitDto,
} from "./rate-limit.dto";
import { rateLimitService } from "./rate-limit.service";

export const rateLimitController = new Elysia({
  prefix: "/admin/rate-limit",
  detail: {
    tags: ["Admin - Rate Limit"],
  },
})
  .use(adminModuleGuard(Permissions.AdminRateLimitManage))
  .get(
    "/",
    async () => rateLimitService.getOverview(),
    {
      response: RateLimitOverviewDto,
      detail: {
        summary: "Get rate limit settings and basic stats",
      },
    },
  )
  .patch(
    "/",
    async ({ body }) => rateLimitService.updateConfig(body),
    {
      body: UpdateRateLimitDto,
      response: RateLimitOverviewDto,
      detail: {
        summary: "Update rate limit settings",
      },
    },
  );
