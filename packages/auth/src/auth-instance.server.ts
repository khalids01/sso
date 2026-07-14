import { customSession } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { env } from "../../env/src/env.server";
import { getUserSessionRbac } from "../../db/src/rbac/session.server";
import { betterAuth } from "better-auth";

import { authOptions } from "./auth-options.server";
import { applicationAuthorizationGuard } from "./lib/application-authorization.server";

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    oauthProvider({
      loginPage: `${env.CORS_ORIGIN}/login`,
      consentPage: `${env.CORS_ORIGIN}/authorize`,
      scopes: ["openid"],
      grantTypes: ["authorization_code"],
      codeExpiresIn: 60,
      allowDynamicClientRegistration: false,
      allowUnauthenticatedClientRegistration: false,
      disableJwtPlugin: true,
      schema: {
        oauthClient: {
          modelName: "applicationClient",
          fields: {
            disabled: "oauthDisabled",
            type: "clientType",
          },
        },
      },
      postLogin: {
        page: `${env.CORS_ORIGIN}/authorize`,
        shouldRedirect: () => true,
        consentReferenceId: () => undefined,
      },
    }),
    applicationAuthorizationGuard(),
    customSession(async ({ user, session }) => {
      const rbac = await getUserSessionRbac(user.id);

      return {
        user,
        session,
        permissions: rbac.permissions,
        roles: rbac.roles,
        primaryRoleSlug: rbac.primaryRoleSlug,
        primaryRoleId: rbac.primaryRoleId,
      };
    }, authOptions),
  ],
});

export type Auth = typeof auth;
