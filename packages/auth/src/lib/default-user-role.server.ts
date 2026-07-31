import type { BetterAuthPlugin, User } from "better-auth";
import { assignUserRole } from "../../../db/src/rbac/assignments.server";
import { Roles } from "@sso/rbac";

type AuthUser = Partial<User> & {
  id?: string;
};

type AssignUserRole = typeof assignUserRole;

async function assignDefaultUserRole(
  user: AuthUser,
  assignRole: AssignUserRole,
) {
  if (!user.id) {
    return;
  }

  await assignRole(user.id, Roles.PlatformUser);
}

export function defaultUserRoleOnSignup(
  assignRole: AssignUserRole = assignUserRole,
): BetterAuthPlugin {
  return {
    id: "default-user-role-on-signup",
    init() {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                after: (user) => assignDefaultUserRole(user, assignRole),
              },
            },
          },
        },
      };
    },
  };
}
