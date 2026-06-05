import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import {
  rolesService,
  RolesPolicyError,
  type AdminActor,
} from "./roles.service";
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from "./roles.dto";

function getActor(ctx: {
  userId?: string;
  permissions: AdminActor["permissions"];
}): AdminActor {
  return {
    id: ctx.userId,
    permissions: ctx.permissions,
  };
}

function handleRolesMutationError(
  error: unknown,
  set: { status?: number | string },
) {
  if (error instanceof RolesPolicyError) {
    set.status = error.status;
    return error.message;
  }

  set.status = 400;
  return error instanceof Error ? error.message : "Role operation failed";
}

export const rolesController = new Elysia({
  prefix: "/admin/roles",
  detail: {
    tags: ["Admin - Roles"],
  },
})
  .use(authGuard)
  .guard(
    {
      beforeHandle: requirePermission(Permissions.AdminAccess),
    },
    (app) =>
      app
        .get(
          "/",
          () => rolesService.listRoles(),
          {
            beforeHandle: requirePermission(Permissions.AdminRolesList),
            detail: {
              summary: "List all roles",
            },
          },
        )
        .get(
          "/assignable",
          () => rolesService.listAssignableRoles(),
          {
            beforeHandle: requirePermission(Permissions.AdminRolesList),
            detail: {
              summary: "List roles that can be assigned to users",
            },
          },
        )
        .get(
          "/permissions",
          () => rolesService.listPermissionCatalog(),
          {
            beforeHandle: requirePermission(Permissions.AdminRolesRead),
            detail: {
              summary: "List permission catalog for role editing",
            },
          },
        )
        .get(
          "/:id",
          async ({ params: { id }, set }) => {
            const role = await rolesService.getRoleById(id);
            if (!role) {
              set.status = 404;
              return "Role not found";
            }
            return role;
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesRead),
            detail: {
              summary: "Get role details and permissions",
            },
          },
        )
        .post(
          "/",
          async ({ body, set, permissions, userId }) => {
            try {
              return await rolesService.createRole(
                body,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleRolesMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesManage),
            body: CreateRoleDto,
            detail: {
              summary: "Create a custom role",
            },
          },
        )
        .patch(
          "/:id",
          async ({ params: { id }, body, set, permissions, userId }) => {
            try {
              return await rolesService.updateRoleMetadata(
                id,
                body,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleRolesMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesUpdate),
            body: UpdateRoleDto,
            detail: {
              summary: "Update custom role metadata",
            },
          },
        )
        .put(
          "/:id/permissions",
          async ({ params: { id }, body, set, permissions, userId }) => {
            try {
              return await rolesService.updateRolePermissions(
                id,
                body.permissions,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleRolesMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesUpdate),
            body: UpdateRolePermissionsDto,
            detail: {
              summary: "Replace role permissions",
            },
          },
        )
        .post(
          "/:id/reset",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await rolesService.resetRole(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleRolesMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesReset),
            detail: {
              summary: "Reset system role permissions to defaults",
            },
          },
        )
        .delete(
          "/:id",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await rolesService.deleteRole(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleRolesMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminRolesManage),
            detail: {
              summary: "Delete a custom role",
            },
          },
        ),
  );
