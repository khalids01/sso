import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload";
import { magicLink } from "better-auth/plugins";
import prisma from "../../db/src/client.server";
import { getUserSessionCacheVersion } from "../../db/src/session-revocation.server";
import { env } from "../../env/src/env.server";
import type { BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  emailVerificationTemplate,
  magicLinkTemplate,
  sendEmail,
} from "../../email/src/index.server";

import { defaultUserRoleOnSignup } from "./lib/default-user-role.server";
import { polarClient } from "./lib/payments.server";
import { polarCustomersForBillingUsers } from "./lib/polar-customers.server";

function getUserIdFromPolarSubscription(
  subscription: WebhookSubscriptionCreatedPayload["data"],
): string | null {
  return subscription.customer.externalId;
}

export const authOptions = {
  disabledPaths: [
    "/token",
    "/oauth2/token",
    "/oauth2/userinfo",
    "/oauth2/introspect",
    "/oauth2/revoke",
    "/oauth2/end-session",
    "/oauth2/register",
    "/oauth2/create-client",
    "/oauth2/get-client",
    "/oauth2/get-clients",
    "/oauth2/update-client",
    "/oauth2/delete-client",
    "/oauth2/client/rotate-secret",
    "/oauth2/get-consent",
    "/oauth2/get-consents",
    "/oauth2/update-consent",
    "/oauth2/delete-consent",
    "/sign-up/email",
    "/sign-in/email",
    "/sign-in/social",
    "/.well-known/openid-configuration",
    "/.well-known/oauth-authorization-server",
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: env.ENABLE_PASSWORD_AUTH,
    disableSignUp: false,
    requireEmailVerification: false,
    autoSignIn: false,
    minPasswordLength: 15,
    maxPasswordLength: 128,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your SSO email",
        html: await emailVerificationTemplate(url),
      });
    },
  },
  socialProviders: {
    ...(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET
      ? {
          linkedin: {
            clientId: env.LINKEDIN_CLIENT_ID,
            clientSecret: env.LINKEDIN_CLIENT_SECRET,
          },
        }
      : {}),
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
  },
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh active sessions daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // cache only; does not control login lifetime
      version: (_session, user) => getUserSessionCacheVersion(user.id),
    },
  },
  trustedOrigins: [env.CORS_ORIGIN],
  advanced: {
    cookies: {
      session_token: {
        name: env.AUTH_SESSION_COOKIE_NAME,
      },
    },
    defaultCookieAttributes: {
      sameSite: env.NODE_ENV === "production" ? "none" : "lax",
      secure: env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
  user: {
    additionalFields: {
      banned: {
        type: "boolean",
        input: false,
        returned: true,
      },
      banReason: {
        type: "string",
        input: false,
        returned: true,
      },
      archived: {
        type: "boolean",
        input: false,
        returned: true,
      },
      onboardingComplete: {
        type: "boolean",
        input: true,
        returned: true,
      },
      polarCustomerId: {
        type: "string",
        input: false,
        returned: false,
      },
      subscriptionId: {
        type: "string",
        input: false,
        returned: false,
      },
      plan: {
        type: "string",
        input: false,
        returned: true,
      },
      subscriptionStatus: {
        type: "string",
        input: false,
        returned: true,
      },
    },
  },
  plugins: [
    ...(env.ENABLE_POLAR
      ? [
          polar({
            client: polarClient,
            createCustomerOnSignUp: false,
            use: [
              checkout({
                products: [
                  {
                    productId: "c9fe3a9c-1663-48ec-b7c5-75fdc6be91ca",
                    slug: "pro_monthly",
                  },
                ],
                successUrl: env.POLAR_SUCCESS_URL!,
                authenticatedUsersOnly: true,
              }),
              portal(),
              webhooks({
                secret: env.POLAR_WEBHOOK_SECRET!,
                onSubscriptionCreated: async (
                  payload: WebhookSubscriptionCreatedPayload,
                ) => {
                  const userId = getUserIdFromPolarSubscription(payload.data);
                  if (!userId) {
                    return;
                  }

                  await prisma.user.update({
                    where: { id: userId },
                    data: {
                      subscriptionId: payload.data.id,
                      subscriptionStatus: payload.data.status,
                    },
                  });
                },
                onSubscriptionUpdated: async (
                  payload: WebhookSubscriptionUpdatedPayload,
                ) => {
                  const userId = getUserIdFromPolarSubscription(payload.data);
                  if (!userId) {
                    return;
                  }

                  await prisma.user.update({
                    where: { id: userId },
                    data: {
                      subscriptionStatus: payload.data.status,
                    },
                  });
                },
              }),
            ],
          }),
          polarCustomersForBillingUsers(),
        ]
      : []),
    magicLink({
      rateLimit: {
        window: 60,
        max: 5,
      },
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to SSO",
          html: await magicLinkTemplate(url),
        });
      },
    }),
    defaultUserRoleOnSignup(),
  ],
} satisfies BetterAuthOptions;

export type AuthOptions = typeof authOptions;
