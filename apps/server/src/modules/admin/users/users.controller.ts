import { Elysia } from "elysia";
import { Permissions } from "@rbac";
import { authGuard } from "@/guards/auth.guard";
import { requirePermission } from "@/rbac/guards/permissions.guard";
import { usersService, type AdminActor } from "./users.service";
import {
  UserQueryDto,
  UpdateUserDto,
  BanUserDto,
  InviteUserDto,
} from "./users.dto";
import { AdminUserPolicyError } from "./users.service";

function getActor(ctx: {
  userId?: string;
  permissions: AdminActor["permissions"];
}): AdminActor {
  return {
    id: ctx.userId,
    permissions: ctx.permissions,
  };
}

function handleUserMutationError(
  error: unknown,
  set: { status?: number | string },
) {
  if (error instanceof AdminUserPolicyError) {
    set.status = error.status;
    return error.message;
  }

  set.status = 400;
  return error instanceof Error ? error.message : "Failed to update user";
}

export const usersController = new Elysia({
  prefix: "/admin/users",
  detail: {
    tags: ["Admin - Users"],
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
          ({ query, permissions, userId }) =>
            usersService.listUsers(query, getActor({ userId, permissions })),
          {
            beforeHandle: requirePermission(Permissions.AdminUsersList),
            query: UserQueryDto,
            detail: {
              summary: "List all users with pagination and filters",
            },
          },
        )
        .get(
          "/:id",
          async ({ params: { id }, set, permissions, userId }) => {
            const user = await usersService.getUserById(
              id,
              getActor({ userId, permissions }),
            );
            if (!user) {
              set.status = 404;
              return "User not found";
            }
            return user;
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersRead),
            detail: {
              summary: "Get detailed information about a user",
            },
          },
        )
        .get(
          "/:id/sessions",
          async ({ params: { id } }) => usersService.getUserSessions(id),
          {
            beforeHandle: requirePermission(Permissions.AdminUsersRead),
            detail: {
              summary: "Get active sessions for a user",
            },
          },
        )
        .patch(
          "/:id",
          async ({ params: { id }, body, set, permissions, userId }) => {
            try {
              return await usersService.updateUser(
                id,
                body,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersUpdate),
            body: UpdateUserDto,
            detail: {
              summary: "Update user details (name, role)",
            },
          },
        )
        .post(
          "/:id/ban",
          async ({ params: { id }, body, set, permissions, userId }) => {
            try {
              return await usersService.banUser(
                id,
                body.reason,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersBan),
            body: BanUserDto,
            detail: {
              summary: "Ban a user from the system",
            },
          },
        )
        .post(
          "/:id/unban",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await usersService.unbanUser(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersUpdate),
            detail: {
              summary: "Unban a user",
            },
          },
        )
        .post(
          "/:id/archive",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await usersService.archiveUser(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersArchive),
            detail: {
              summary: "Archive a user (soft delete)",
            },
          },
        )
        .post(
          "/:id/restore",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await usersService.restoreUser(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersArchive),
            detail: {
              summary: "Restore an archived user",
            },
          },
        )
        .delete(
          "/:id",
          async ({ params: { id }, set, permissions, userId }) => {
            try {
              return await usersService.deleteUserPermanent(
                id,
                getActor({ userId, permissions }),
              );
            } catch (error) {
              return handleUserMutationError(error, set);
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersDelete),
            detail: {
              summary: "Permanently delete a user from the database",
            },
          },
        )
        .post(
          "/invite",
          async ({ body, userId, set }) => {
            if (!userId) {
              set.status = 401;
              return "Unauthorized";
            }

            try {
              return await usersService.inviteUser(
                body.email,
                body.role || "USER",
                userId,
              );
            } catch (error) {
              set.status = 400;
              return error instanceof Error ? error.message : "Invite failed";
            }
          },
          {
            beforeHandle: requirePermission(Permissions.AdminUsersInvite),
            body: InviteUserDto,
            detail: {
              summary: "Invite a new user via email",
            },
          },
        ),
  );
