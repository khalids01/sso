import { Elysia } from "elysia";
import { Permissions, type Permission } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";

export function adminModuleGuard(modulePermission: Permission) {
  return new Elysia({ name: "admin-module-rbac" })
    .use(authGuard)
    .guard({
      beforeHandle: [
        requirePermission(Permissions.AdminAccess),
        requirePermission(modulePermission),
      ],
    });
}
