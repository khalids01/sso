import type { BetterAuthPlugin, User } from "better-auth";
import { assignUserRole } from "../../../db/src/rbac/assignments.server";
import { Roles } from "@rbac";

type AuthUser = Partial<User> & {
  id?: string;
};

async function assignDefaultUserRole(user: AuthUser) {
  if (!user.id) {
    return;
  }

  await assignUserRole(user.id, Roles.PlatformUser);
}

export function defaultUserRoleOnSignup(): BetterAuthPlugin {
  return {
    id: "default-user-role-on-signup",
    init() {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                after: assignDefaultUserRole,
              },
            },
          },
        },
      };
    },
  };
}
