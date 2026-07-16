import { customSession, jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";
import { env } from "../../env/src/env.server";
import { getUserSessionRbac } from "../../db/src/rbac/session.server";
import { betterAuth } from "better-auth";

import { authOptions } from "./auth-options.server";
import { applicationAuthorizationGuard } from "./lib/application-authorization.server";
import { hashOAuthToken } from "./lib/oauth-token.server";

export const auth = betterAuth({
  ...authOptions,
  plugins: [
    ...(authOptions.plugins ?? []),
    jwt({
      disableSettingJwtHeader: true,
      jwks: {
        keyPairConfig: { alg: "RS256", modulusLength: 2048 },
        rotationInterval: 60 * 60 * 24 * 30,
        gracePeriod: 60 * 60 * 24,
        jwksPath: "/jwks",
      },
      jwt: {
        issuer: env.SSO_ISSUER,
        expirationTime: "10m",
      },
    }),
    oauthProvider({
      loginPage: `${env.CORS_ORIGIN}/login`,
      consentPage: `${env.CORS_ORIGIN}/authorize`,
      scopes: ["openid"],
      grantTypes: ["authorization_code"],
      codeExpiresIn: 60,
      allowDynamicClientRegistration: false,
      allowUnauthenticatedClientRegistration: false,
      disableJwtPlugin: false,
      // Discovery remains intentionally disabled until the complete provider
      // surface is approved for production.
      silenceWarnings: {
        oauthAuthServerConfig: true,
        openidConfig: true,
      },
      storeTokens: {
        hash: (token) => hashOAuthToken(token),
      },
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
