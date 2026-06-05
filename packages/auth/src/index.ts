import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { magicLink, customSession } from "better-auth/plugins";
import prisma from "@db";
import { getUserSessionRbac } from "@db/rbac/session";
import { env } from "@env/server";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sendEmail, magicLinkTemplate } from "@email";

import { polarClient } from "./lib/payments";
import { polarCustomersForBillingUsers } from "./lib/polar-customers";

const options = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30, // 1 month
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
      sameSite: "none",
      secure: true,
      httpOnly: true,
    },
  },
  user: {
    additionalFields: {
      banned: {
        type: "boolean",
        input: false,
        output: true,
      },
      banReason: {
        type: "string",
        input: false,
        output: true,
      },
      archived: {
        type: "boolean",
        input: false,
        output: true,
      },
      onboardingComplete: {
        type: "boolean",
        input: true,
        output: true,
      },
      polarCustomerId: {
        type: "string",
        input: false,
        output: false,
      },
      subscriptionId: {
        type: "string",
        input: false,
        output: false,
      },
      plan: {
        type: "string",
        input: false,
        output: true,
      },
      subscriptionStatus: {
        type: "string",
        input: false,
        output: true,
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
                onSubscriptionCreated: async (payload: any) => {
                  const { subscription, customer } = payload;
                  await prisma.user.update({
                    where: { id: customer.externalId as string },
                    data: {
                      subscriptionId: subscription.id as string,
                      subscriptionStatus: subscription.status as string,
                    },
                  });
                },
                onSubscriptionUpdated: async (payload: any) => {
                  const { subscription, customer } = payload;
                  await prisma.user.update({
                    where: { id: customer.externalId as string },
                    data: {
                      subscriptionStatus: subscription.status as string,
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
          subject: "Sign in to TS Starter",
          html: await magicLinkTemplate(url),
        });
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => {
      const rbac = await getUserSessionRbac(user.id);

      return {
        user,
        session,
        permissions: rbac.permissions,
        roles: rbac.roles,
        primaryRoleSlug: rbac.primaryRoleSlug,
      };
    }, options),
  ],
});

export type Auth = typeof auth;
