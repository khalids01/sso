import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { adminModuleGuard } from "../admin-rbac.plugin";
import { metadataService } from "./metadata.service";

export const metadataController = new Elysia({
  prefix: "/admin/metadata",
  detail: {
    tags: ["Admin - Metadata"],
  },
})
  .use(adminModuleGuard(Permissions.AdminMetadataRead))
  .get("/overview", () => metadataService.getOverview(), {
    detail: {
      summary: "Get dashboard overview statistics",
    },
  });
