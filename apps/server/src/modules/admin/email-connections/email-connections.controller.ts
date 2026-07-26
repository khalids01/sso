import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import {
  CreateEmailConnectionDto,
  EmailConnectionsQueryDto,
  TestEmailConnectionDto,
  UpdateEmailConnectionDto,
} from "./email-connections.dto";
import { emailConnectionsService, EmailConnectionsPolicyError } from "./email-connections.service";

function handle(error: unknown, set: { status?: number | string }) {
  if (error instanceof EmailConnectionsPolicyError) {
    set.status = error.status;
    return error.message;
  }
  set.status = 400;
  return "Email connection operation failed";
}

export const emailConnectionsController = new Elysia({
  prefix: "/admin/email-connections",
  detail: { tags: ["Admin - Email Connections"] },
}).use(authGuard).guard(
  { beforeHandle: requirePermission(Permissions.AdminAccess) },
  (app) => app
    .get("/", ({ query }) => emailConnectionsService.list(query), {
      beforeHandle: requirePermission(Permissions.AdminEmailConnectionsRead),
      query: EmailConnectionsQueryDto,
    })
    .get("/options", () => emailConnectionsService.options(), {
      beforeHandle: requirePermission(Permissions.AdminApplicationsRead),
    })
    .post("/", async ({ body, set, userId }) => {
      try { return await emailConnectionsService.create(body, userId); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage), body: CreateEmailConnectionDto })
    .get("/:id", async ({ params: { id }, set }) => {
      try { return await emailConnectionsService.getById(id); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsRead) })
    .get("/:id/secret", async ({ params: { id }, set, userId }) => {
      try {
        return await emailConnectionsService.revealSecret(id, userId);
      } catch (error) {
        return handle(error, set);
      }
    }, {
      beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage),
    })
    .patch("/:id", async ({ params: { id }, body, set, userId }) => {
      try { return await emailConnectionsService.update(id, body, userId); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage), body: UpdateEmailConnectionDto })
    .post("/:id/test", async ({ params: { id }, body, set }) => {
      try { return await emailConnectionsService.test(id, body.to); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage), body: TestEmailConnectionDto })
    .post("/:id/archive", async ({ params: { id }, set, userId }) => {
      try { return await emailConnectionsService.lifecycle(id, "archived", userId); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage) })
    .post("/:id/restore", async ({ params: { id }, set, userId }) => {
      try { return await emailConnectionsService.lifecycle(id, "active", userId); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage) })
    .delete("/:id/permanent", async ({ params: { id }, set }) => {
      try { return await emailConnectionsService.deletePermanent(id); } catch (error) { return handle(error, set); }
    }, { beforeHandle: requirePermission(Permissions.AdminEmailConnectionsManage) }),
);
