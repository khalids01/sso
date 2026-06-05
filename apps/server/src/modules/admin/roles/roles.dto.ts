import { t } from "elysia";
import { AllPermissions } from "@rbac";

const PermissionNameSchema = t.Union(
  AllPermissions.map((permission) => t.Literal(permission)),
);

export const CreateRoleDto = t.Object({
  slug: t.String({ minLength: 3, maxLength: 64 }),
  name: t.String({ minLength: 1, maxLength: 100 }),
  permissions: t.Optional(t.Array(PermissionNameSchema)),
});

export const UpdateRoleDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
});

export const UpdateRolePermissionsDto = t.Object({
  permissions: t.Array(PermissionNameSchema),
});

export type CreateRoleInput = typeof CreateRoleDto.static;
export type UpdateRoleInput = typeof UpdateRoleDto.static;
export type UpdateRolePermissionsInput = typeof UpdateRolePermissionsDto.static;
