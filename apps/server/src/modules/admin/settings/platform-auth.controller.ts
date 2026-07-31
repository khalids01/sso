import { Elysia } from "elysia";
import { Permissions } from "@sso/rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import { getPlatformAuthSettings } from "../../auth/platform-auth-settings.service";
import { UpdatePlatformAuthDto } from "./platform-auth.dto";
import {
  PlatformAuthSettingsError,
  updatePlatformAuthSettings,
} from "./platform-auth.service";

export const platformAuthSettingsController = new Elysia({
  prefix: "/admin/settings/platform-auth",
})
  .use(authGuard)
  .guard(
    { beforeHandle: requirePermission(Permissions.AdminAccess) },
    (app) =>
      app
        .get("/", () => getPlatformAuthSettings(), {
          beforeHandle: requirePermission(Permissions.AdminSettingsRead),
        })
        .patch(
          "/",
          async ({ body, set, userId }) => {
            try {
              return await updatePlatformAuthSettings(body, userId);
            } catch (error) {
              if (error instanceof PlatformAuthSettingsError) {
                set.status = error.status;
                return error.message;
              }
              set.status = 400;
              return "Platform authentication settings update failed";
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminSettingsManage),
            body: UpdatePlatformAuthDto,
          },
        ),
  );
