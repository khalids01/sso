import { customSession } from "better-auth/plugins";
import { getUserSessionRbac } from "@db/rbac/session";
import { betterAuth } from "better-auth";

import { authOptions } from "./auth-options";

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    customSession(async ({ user, session }) => {
      const rbac = await getUserSessionRbac(user.id);

      return {
        user,
        session,
        permissions: rbac.permissions,
        roles: rbac.roles,
        primaryRoleSlug: rbac.primaryRoleSlug,
      };
    }, authOptions),
  ],
});

export type Auth = typeof auth;
