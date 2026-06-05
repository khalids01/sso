import { t } from "elysia";
import { InviteableRoleSlugs, Roles } from "@rbac";

export const InviteableUserRoleSchema = t.Union(
  InviteableRoleSlugs.map((slug) => t.Literal(slug)),
);

export const AssignableUserRoleSchema = t.String({ minLength: 1, maxLength: 64 });

export const UserRoleFilterSchema = t.Union([
  t.Literal(Roles.PlatformOwner),
  t.Literal(Roles.PlatformAdmin),
  t.Literal(Roles.PlatformUser),
]);

export const UpdateUserDto = t.Object({
    name: t.Optional(t.String()),
    roleSlug: t.Optional(AssignableUserRoleSchema),
});

export const BanUserDto = t.Object({
    reason: t.Optional(t.String()),
});

export const InviteUserDto = t.Object({
    email: t.String({ format: "email" }),
    roleSlug: t.Optional(InviteableUserRoleSchema),
});

export const UserQueryDto = t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 10 })),
    search: t.Optional(t.String()),
    roleSlug: t.Optional(UserRoleFilterSchema),
    banned: t.Optional(t.Boolean()),
    archived: t.Optional(t.Boolean()),
});

export type UserQuery = typeof UserQueryDto.static;
export type UpdateUser = typeof UpdateUserDto.static;
export type BanUser = typeof BanUserDto.static;
export type InviteUser = typeof InviteUserDto.static;
