import { Elysia } from "elysia";
import { auth } from "@auth/server";
import prisma from "@db/server";
import { env } from "@env/server";
import { randomUUID } from "node:crypto";
import {
  CheckEmailDto,
  MagicLinkLoginDto,
  MagicLinkSignupDto,
  PasswordLoginDto,
  PasswordSignupDto,
  SocialLoginDto,
} from "./auth.dto";
import { recordLoginDenied } from "./auth-observability.service";
import { runWithApplicationSocialProviderCredentials } from "@auth/server";
import {
  createSocialProviderContext,
  getClientSocialProviderCredentials,
  socialProviderContextCookie,
} from "./social-provider-credentials.service";

function resolveCallbackURL(callbackURL?: string) {
  if (!callbackURL) {
    return env.CORS_ORIGIN;
  }

  try {
    const baseUrl = new URL(env.CORS_ORIGIN);
    const parsedUrl = new URL(callbackURL, env.CORS_ORIGIN);

    if (parsedUrl.origin !== baseUrl.origin) {
      return env.CORS_ORIGIN;
    }

    return parsedUrl.toString();
  } catch {
    return env.CORS_ORIGIN;
  }
}

async function getApplicationPolicy(callbackURL?: string) {
  const resolved = resolveCallbackURL(callbackURL);
  const clientId = new URL(resolved).searchParams.get("client_id");
  if (!clientId) return null;
  return prisma.applicationClient.findUnique({
    where: { clientId },
    select: {
      clientId: true,
      status: true,
      oauthDisabled: true,
      application: {
        select: {
          status: true,
          signInMethods: true,
          signUpMethods: true,
          registrationMode: true,
          passwordEmailVerificationRequired: true,
        },
      },
    },
  });
}

export const authController = new Elysia({ prefix: "/auth" })
  .post(
    "/social",
    async ({ body, request, set }) => {
      const callbackURL = resolveCallbackURL(body.callbackURL);
      const callback = new URL(callbackURL);
      const oauthQuery = callback.search.slice(1);
      const requestedClientId = callback.searchParams.get("client_id");
      if (!oauthQuery || !requestedClientId) {
        set.status = 403;
        return { message: "Invalid application authentication request" };
      }
      try {
        await auth.api.getOAuthClientPublicPrelogin({
          body: { client_id: requestedClientId, oauth_query: oauthQuery },
          headers: request.headers,
        });
      } catch {
        set.status = 403;
        return {
          message: "Invalid or expired application authentication request",
        };
      }
      const policy = await getApplicationPolicy(callbackURL);
      const allowedMethods = body.requestSignUp
        ? policy?.application.signUpMethods
        : policy?.application.signInMethods;
      if (
        !policy ||
        policy.status !== "active" ||
        policy.oauthDisabled ||
        policy.application.status !== "active" ||
        (body.requestSignUp &&
          policy.application.registrationMode === "closed") ||
        !allowedMethods?.includes(body.provider)
      ) {
        set.status = 403;
        return {
          message: `${body.provider} authentication is not available for this application`,
        };
      }
      if (body.provider === "linkedin") {
        return auth.api.signInSocial({
          body: {
            provider: body.provider,
            callbackURL,
            requestSignUp: body.requestSignUp,
            disableRedirect: true,
          },
          headers: request.headers,
          asResponse: true,
        });
      }
      const credentials = await getClientSocialProviderCredentials(
        policy.clientId,
        body.provider,
      );
      if (!credentials) {
        set.status = 403;
        return {
          message: `${body.provider} credentials are not configured for this client`,
        };
      }
      const response = await runWithApplicationSocialProviderCredentials(
        body.provider,
        credentials,
        () =>
          auth.api.signInSocial({
            body: {
              provider: body.provider,
              callbackURL,
              requestSignUp: body.requestSignUp,
              disableRedirect: true,
            },
            headers: request.headers,
            asResponse: true,
          }),
      );
      if (response.ok) {
        response.headers.append(
          "set-cookie",
          socialProviderContextCookie(
            body.provider,
            createSocialProviderContext(body.provider, policy.clientId),
          ),
        );
      }
      return response;
    },
    { body: SocialLoginDto },
  )
  .post(
    "/check-email",
    async ({ body }) => {
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      return { exists: !!user };
    },
    {
      body: CheckEmailDto,
    },
  )
  .post(
    "/magic-link/login",
    async ({ body, request, set }) => {
      const policy = await getApplicationPolicy(body.callbackURL);
      if (policy && !policy.application.signInMethods.includes("magic_link")) {
        set.status = 403;
        return { message: "Magic-link sign-in is disabled for this application" };
      }
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (!user) {
        const requestId = randomUUID();
        await recordLoginDenied({
          requestId,
          reason: "user_not_found",
          method: "magic_link",
          status: 400,
        });
        set.status = 400;
        set.headers["x-request-id"] = requestId;
        return { message: "User not found" };
      }
      await auth.api.signInMagicLink({
        body: {
          email: body.email,
          callbackURL: resolveCallbackURL(body.callbackURL),
        },
        headers: request.headers,
      });
      return { success: true };
    },
    {
      body: MagicLinkLoginDto,
    },
  )
  .post(
    "/magic-link/signup",
    async ({ body, request, set }) => {
      const policy = await getApplicationPolicy(body.callbackURL);
      if (
        policy &&
        (policy.application.status !== "active" ||
          policy.application.registrationMode === "closed" ||
          !policy.application.signUpMethods.includes("magic_link"))
      ) {
        set.status = 403;
        return { message: "Registration is not available for this application" };
      }
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (user) {
        set.status = 400;
        return { message: "User already exists" };
      }
      await auth.api.signInMagicLink({
        body: {
          email: body.email,
          name: body.name,
          callbackURL: resolveCallbackURL(body.callbackURL),
        },
        headers: request.headers,
      });
      return { success: true };
    },
    {
      body: MagicLinkSignupDto,
    },
  )
  .post(
    "/password/login",
    async ({ body, request, set }) => {
      const callbackURL = resolveCallbackURL(body.callbackURL);
      const policy = await getApplicationPolicy(callbackURL);
      if (policy && !policy.application.signInMethods.includes("password")) {
        set.status = 403;
        return { message: "Password sign-in is disabled for this application" };
      }

      const response = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
          callbackURL,
        },
        headers: request.headers,
        asResponse: true,
      });
      if (!response.ok) return response;

      const result = (await response.clone().json()) as {
        token?: string;
        user?: { emailVerified?: boolean };
      };
      const verificationRequired =
        policy?.application.passwordEmailVerificationRequired ?? true;
      if (verificationRequired && result.user?.emailVerified !== true) {
        if (result.token) {
          await prisma.session.deleteMany({ where: { token: result.token } });
        }
        await auth.api.sendVerificationEmail({
          body: { email: body.email, callbackURL },
          headers: request.headers,
        });
        set.status = 403;
        return {
          message: "Verify your email before signing in. We sent a new verification link.",
          requiresEmailVerification: true,
        };
      }

      return response;
    },
    { body: PasswordLoginDto },
  )
  .post(
    "/password/signup",
    async ({ body, request, set }) => {
      const callbackURL = resolveCallbackURL(body.callbackURL);
      const policy = await getApplicationPolicy(callbackURL);
      if (
        !policy ||
        policy.application.status !== "active" ||
        policy.application.registrationMode === "closed" ||
        !policy.application.signUpMethods.includes("password")
      ) {
        set.status = 403;
        return { message: "Password registration is not available for this application" };
      }

      const signupResponse = await auth.api.signUpEmail({
        body: {
          email: body.email,
          name: body.name,
          password: body.password,
          callbackURL,
          onboardingComplete: false,
        },
        headers: request.headers,
        asResponse: true,
      });
      if (!signupResponse.ok) return signupResponse;

      if (policy.application.passwordEmailVerificationRequired) {
        await auth.api.sendVerificationEmail({
          body: { email: body.email, callbackURL },
          headers: request.headers,
        });
        return {
          success: true,
          requiresEmailVerification: true,
        };
      }

      return auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
          callbackURL,
        },
        headers: request.headers,
        asResponse: true,
      });
    },
    { body: PasswordSignupDto },
  );
