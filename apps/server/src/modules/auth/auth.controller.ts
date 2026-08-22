import { Elysia, t } from "elysia";
import {
  auth,
  runWithOAuthProviderConnection,
  type ApplicationSocialProviderId,
} from "@sso/auth/server";
import prisma from "@sso/db/server";
import { env } from "@sso/env/server";
import { randomUUID } from "node:crypto";
import {
  CheckEmailDto,
  ApplicationAuthBootstrapDto,
  EmbeddedPasswordLoginDto,
  EmbeddedPasswordSignupDto,
  EmbeddedPasswordResetRequestDto,
  EmbeddedMagicLinkDto,
  MagicLinkLoginDto,
  MagicLinkSignupDto,
  PasswordLoginDto,
  PasswordSignupDto,
  SocialLoginDto,
} from "./auth.dto";
import {
  issueEmbeddedAuthorizationCode,
  createEmbeddedMagicLinkTransaction,
  consumeEmbeddedMagicLinkTransaction,
  OAuthTokenError,
  validateEmbeddedAuthorizationRequest,
  validateEmbeddedPasswordResetRequest,
  getPublicClientMetadata,
} from "../oauth/oauth-token.service";
import {
  getApplicationSocialProviderConnection,
  storeSocialProviderContext,
} from "./social-provider-credentials.service";
import { recordApplicationUsage } from "../application-usage/application-usage.service";
import {
  getPlatformAuthSettings,
  getPlatformOAuthConnection,
} from "./platform-auth-settings.service";
import {
  allowEmbeddedBrowserOrigin,
  forwardCentralAuthCookies,
  getCentralAuthHeaders,
} from "./browser-auth-cors";

const socialProviderScopes = {
  google: ["openid", "profile", "email"],
  linkedin: ["openid", "profile", "email"],
  github: ["read:user", "user:email"],
  facebook: ["public_profile", "email"],
} satisfies Record<ApplicationSocialProviderId, string[]>;

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
      id: true,
      clientId: true,
      applicationId: true,
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

type ApplicationPolicy = Awaited<ReturnType<typeof getApplicationPolicy>>;

function recordAuthUsage(input: {
  policy: ApplicationPolicy;
  type: "login" | "signup";
  outcome: "success" | "denied";
  method: "password" | "magic_link";
  request: Request;
  userId?: string | null;
  reason: string;
  requestId?: string;
}) {
  return recordApplicationUsage({
    type: input.type,
    outcome: input.outcome,
    userId: input.userId,
    applicationId: input.policy?.applicationId,
    applicationClientId: input.policy?.id,
    authMethod: input.method,
    requestId: input.requestId ?? randomUUID(),
    reason: input.reason,
    request: input.request,
  });
}

async function getCreatedSession(token: string | undefined, userId: string | undefined) {
  if (!token || !userId) return null;
  return prisma.session.findFirst({
    where: { token, userId, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
}

function embeddedAuthError(set: { status?: number | string }, error: unknown) {
  if (error instanceof OAuthTokenError) {
    set.status = error.status;
    return { error: error.code, message: error.auditReason };
  }
  set.status = 500;
  return { error: "server_error", message: "Embedded authentication failed" };
}

export const authController = new Elysia({ prefix: "/auth" })
  .get("/platform-settings", () => getPlatformAuthSettings())
  .post(
    "/application/bootstrap",
    async ({ body, request, set }) => {
      try {
        const [prelogin, metadata, session] = await Promise.all([
          auth.api.getOAuthClientPublicPrelogin({
            body: {
              client_id: body.clientId,
              oauth_query: body.oauthQuery,
            },
            headers: request.headers,
          }),
          getPublicClientMetadata(body.clientId),
          auth.api.getSession({ headers: request.headers }),
        ]);
        if (!metadata || metadata.client_id !== body.clientId) {
          set.status = 404;
          return { error: "client_not_found" as const };
        }
        return {
          name: prelogin.client_name || "application",
          logoUrl: metadata.application_logo_url,
          policy: {
            signInMethods: metadata.sign_in_methods,
            signUpMethods: metadata.sign_up_methods,
            registrationMode: metadata.registration_mode,
            passwordEmailVerificationRequired:
              metadata.password_email_verification_required,
          },
          isAuthenticated: Boolean(session?.user.id),
        };
      } catch {
        set.status = 403;
        return { error: "invalid_oauth_request" as const };
      }
    },
    { body: ApplicationAuthBootstrapDto },
  )
  .post(
    "/sdk/magic-link",
    async ({ body, request, set }) => {
      try {
        await validateEmbeddedAuthorizationRequest({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          method: "magic_link",
          intent: body.intent,
        });
        allowEmbeddedBrowserOrigin({ request, claimedOrigin: body.origin, set });
        if (body.intent === "signup" && !body.name) {
          set.status = 400;
          return { error: "invalid_request", message: "Name is required" };
        }
        const existingUser = await prisma.user.findUnique({
          where: { email: body.email },
          select: { id: true },
        });
        if (body.intent === "signin" && !existingUser) {
          set.status = 400;
          return { error: "user_not_found", message: "User not found" };
        }
        if (body.intent === "signup" && existingUser) {
          set.status = 400;
          return { error: "user_already_exists", message: "User already exists" };
        }
        const transaction = await createEmbeddedMagicLinkTransaction({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          state: body.state,
          nonce: body.nonce,
          codeChallenge: body.codeChallenge,
        });
        const callbackURL = new URL("/auth/sdk/magic-link/callback", env.BETTER_AUTH_URL);
        callbackURL.searchParams.set("transaction", transaction);
        await auth.api.signInMagicLink({
          body: {
            email: body.email,
            ...(body.name ? { name: body.name } : {}),
            callbackURL: callbackURL.toString(),
          },
          headers: getCentralAuthHeaders(request),
        });
        return { success: true };
      } catch (error) {
        return embeddedAuthError(set, error);
      }
    },
    { body: EmbeddedMagicLinkDto },
  )
  .get(
    "/sdk/magic-link/callback",
    async ({ query, request, set, redirect }) => {
      try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user.id || !session.session.id) {
          set.status = 401;
          return { error: "authentication_required" };
        }
        const transaction = await consumeEmbeddedMagicLinkTransaction(query.transaction);
        const redirectUrl = await issueEmbeddedAuthorizationCode({
          ...transaction,
          userId: session.user.id,
          sessionId: session.session.id,
        });
        return redirect(redirectUrl, 303);
      } catch (error) {
        return embeddedAuthError(set, error);
      }
    },
    { query: t.Object({ transaction: t.String({ minLength: 20, maxLength: 256 }) }) },
  )
  .post(
    "/sdk/password/request-reset",
    async ({ body, request, set }) => {
      try {
        await validateEmbeddedPasswordResetRequest({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
        });
        allowEmbeddedBrowserOrigin({ request, claimedOrigin: body.origin, set });
        const resetPage = new URL("/reset-password", env.CORS_ORIGIN);
        resetPage.searchParams.set("client_id", body.clientId);
        await auth.api.requestPasswordReset({
          body: { email: body.email, redirectTo: resetPage.toString() },
          headers: getCentralAuthHeaders(request),
        });
        // Do not disclose whether this email owns a password account.
        return { success: true };
      } catch (error) {
        return embeddedAuthError(set, error);
      }
    },
    { body: EmbeddedPasswordResetRequestDto },
  )
  .post(
    "/sdk/password/login",
    async ({ body, request, set }) => {
      try {
        const client = await validateEmbeddedAuthorizationRequest({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          method: "password",
          intent: "signin",
        });
        allowEmbeddedBrowserOrigin({ request, claimedOrigin: body.origin, set });
        const response = await auth.api.signInEmail({
          body: { email: body.email, password: body.password },
          headers: getCentralAuthHeaders(request),
          asResponse: true,
        });
        if (!response.ok) {
          set.status = 401;
          return { error: "invalid_credentials", message: "Invalid email or password" };
        }
        const result = await response.json() as {
          token?: string;
          user?: { id?: string; emailVerified?: boolean };
        };
        if (
          client.application.passwordEmailVerificationRequired &&
          result.user?.emailVerified !== true
        ) {
          if (result.token) await prisma.session.deleteMany({ where: { token: result.token } });
          set.status = 403;
          return {
            error: "email_verification_required",
            message: "Verify your email before signing in",
          };
        }
        const session = await getCreatedSession(result.token, result.user?.id);
        if (!session || !result.user?.id) {
          set.status = 500;
          return { error: "session_creation_failed", message: "Could not create session" };
        }
        forwardCentralAuthCookies(response, set);
        const redirectUrl = await issueEmbeddedAuthorizationCode({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          state: body.state,
          nonce: body.nonce,
          codeChallenge: body.codeChallenge,
          userId: result.user.id,
          sessionId: session.id,
        });
        return { redirectUrl };
      } catch (error) {
        return embeddedAuthError(set, error);
      }
    },
    { body: EmbeddedPasswordLoginDto },
  )
  .post(
    "/sdk/password/signup",
    async ({ body, request, set }) => {
      try {
        const client = await validateEmbeddedAuthorizationRequest({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          method: "password",
          intent: "signup",
        });
        allowEmbeddedBrowserOrigin({ request, claimedOrigin: body.origin, set });
        const signup = await auth.api.signUpEmail({
          body: {
            name: body.name,
            email: body.email,
            password: body.password,
            onboardingComplete: false,
          },
          headers: getCentralAuthHeaders(request),
          asResponse: true,
        });
        if (!signup.ok) {
          set.status = signup.status;
          return { error: "signup_rejected", message: "Could not create account" };
        }
        if (client.application.passwordEmailVerificationRequired) {
          await auth.api.sendVerificationEmail({
            body: { email: body.email, callbackURL: body.origin },
            headers: getCentralAuthHeaders(request),
          });
          return { requiresEmailVerification: true };
        }
        const signin = await auth.api.signInEmail({
          body: { email: body.email, password: body.password },
          headers: getCentralAuthHeaders(request),
          asResponse: true,
        });
        const result = await signin.json() as {
          token?: string;
          user?: { id?: string };
        };
        const session = await getCreatedSession(result.token, result.user?.id);
        if (!signin.ok || !session || !result.user?.id) {
          set.status = 500;
          return { error: "session_creation_failed", message: "Could not create session" };
        }
        forwardCentralAuthCookies(signin, set);
        const redirectUrl = await issueEmbeddedAuthorizationCode({
          clientId: body.clientId,
          redirectUri: body.redirectUri,
          origin: new URL(body.origin).origin,
          state: body.state,
          nonce: body.nonce,
          codeChallenge: body.codeChallenge,
          userId: result.user.id,
          sessionId: session.id,
        });
        return { redirectUrl };
      } catch (error) {
        return embeddedAuthError(set, error);
      }
    },
    { body: EmbeddedPasswordSignupDto },
  )
  .post(
    "/social",
    async ({ body, request, set }) => {
      const callbackURL = resolveCallbackURL(body.callbackURL);
      const requestId = randomUUID();
      const callback = new URL(callbackURL);
      const oauthQuery = callback.search.slice(1);
      const requestedClientId = callback.searchParams.get("client_id");
      const isApplicationRequest = Boolean(oauthQuery && requestedClientId);
      if (isApplicationRequest) {
        try {
          await auth.api.getOAuthClientPublicPrelogin({
            body: { client_id: requestedClientId!, oauth_query: oauthQuery },
            headers: request.headers,
          });
        } catch {
          set.status = 403;
          return {
            message: "Invalid or expired application authentication request",
          };
        }
      }
      const policy = isApplicationRequest
        ? await getApplicationPolicy(callbackURL)
        : null;
      const platformSettings = !isApplicationRequest
        ? await getPlatformAuthSettings()
        : null;
      const allowedMethods = body.requestSignUp
        ? (policy?.application.signUpMethods ?? platformSettings?.signUpMethods)
        : (policy?.application.signInMethods ?? platformSettings?.signInMethods);
      if (
        (isApplicationRequest &&
          (!policy ||
            policy.status !== "active" ||
            policy.oauthDisabled ||
            policy.application.status !== "active" ||
            (body.requestSignUp &&
              policy.application.registrationMode === "closed"))) ||
        (!isApplicationRequest &&
          body.requestSignUp &&
          platformSettings?.registrationMode === "closed") ||
        !allowedMethods?.includes(body.provider)
      ) {
        await recordApplicationUsage({
          type: body.requestSignUp ? "signup" : "login",
          outcome: "denied",
          applicationId: policy?.applicationId,
          applicationClientId: policy?.id,
          authMethod: body.provider,
          requestId,
          reason: "application_social_auth_unavailable",
          request,
        });
        set.status = 403;
        return {
          message: `${body.provider} authentication is not available for this application`,
        };
      }
      const assignedConnection = policy
        ? await getApplicationSocialProviderConnection(
            policy.clientId,
            body.provider,
          )
        : null;
      const platformConnection = !policy
        ? await getPlatformOAuthConnection(body.provider)
        : null;
      const runtimeConnection =
        assignedConnection?.connection ?? platformConnection;
      if (!runtimeConnection) {
        await recordApplicationUsage({
          type: body.requestSignUp ? "signup" : "login",
          outcome: "denied",
          applicationId: policy?.applicationId,
          applicationClientId: policy?.id,
          authMethod: body.provider,
          requestId,
          reason: "oauth_connection_unavailable",
          request,
        });
        set.status = 403;
        return {
          message: `${body.provider} does not have an active OAuth connection for this application`,
        };
      }
      const response = await runWithOAuthProviderConnection(
        runtimeConnection,
        () =>
          auth.api.signInSocial({
            body: {
              provider: body.provider,
              callbackURL,
              requestSignUp: body.requestSignUp,
              disableRedirect: true,
              scopes: socialProviderScopes[body.provider],
            },
            headers: request.headers,
            asResponse: true,
          }),
      );
      if (response.ok) {
        const result = (await response.clone().json()) as { url?: string };
        const state = result.url
          ? new URL(result.url).searchParams.get("state")
          : null;
        if (!state) {
          await recordApplicationUsage({
            type: body.requestSignUp ? "signup" : "login",
            outcome: "error",
            applicationId: assignedConnection?.applicationId,
            applicationClientId: assignedConnection?.applicationClientId,
            oauthProviderConnectionId: runtimeConnection.id,
            authMethod: body.provider,
            requestId,
            reason: "provider_state_missing",
            request,
          });
          set.status = 502;
          return { message: "OAuth provider did not return a valid state" };
        }
        await storeSocialProviderContext(state, {
          provider: body.provider,
          scope: assignedConnection ? "application" : "platform",
          ...(assignedConnection
            ? {
                applicationId: assignedConnection.applicationId,
                applicationClientId: assignedConnection.applicationClientId,
                downstreamClientId: assignedConnection.downstreamClientId,
              }
            : {}),
          oauthProviderConnectionId: runtimeConnection.id,
          credentialVersion: runtimeConnection.credentialVersion,
          intent: body.requestSignUp ? "signup" : "login",
          requestId,
        });
      } else {
        await recordApplicationUsage({
          type: body.requestSignUp ? "signup" : "login",
          outcome: "denied",
          applicationId: assignedConnection?.applicationId,
          applicationClientId: assignedConnection?.applicationClientId,
          oauthProviderConnectionId: runtimeConnection.id,
          authMethod: body.provider,
          requestId,
          reason: "provider_authorization_start_failed",
          request,
        });
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
      const platformSettings = policy ? null : await getPlatformAuthSettings();
      if (
        (policy && !policy.application.signInMethods.includes("magic_link")) ||
        (!policy && !platformSettings?.signInMethods.includes("magic_link"))
      ) {
        await recordAuthUsage({
          policy,
          type: "login",
          outcome: "denied",
          method: "magic_link",
          request,
          reason: "method_disabled",
        });
        set.status = 403;
        return { message: "Magic-link sign-in is disabled for this application" };
      }
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (!user) {
        const requestId = randomUUID();
        await recordAuthUsage({
          policy,
          type: "login",
          outcome: "denied",
          method: "magic_link",
          request,
          reason: "user_not_found",
          requestId,
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
      await recordAuthUsage({
        policy,
        type: "login",
        outcome: "success",
        method: "magic_link",
        request,
        userId: user.id,
        reason: "magic_link_sent",
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
      const platformSettings = policy ? null : await getPlatformAuthSettings();
      if (
        (policy &&
          (policy.application.status !== "active" ||
          policy.application.registrationMode === "closed" ||
          !policy.application.signUpMethods.includes("magic_link"))) ||
        (!policy &&
          (platformSettings?.registrationMode === "closed" ||
            !platformSettings?.signUpMethods.includes("magic_link")))
      ) {
        await recordAuthUsage({
          policy,
          type: "signup",
          outcome: "denied",
          method: "magic_link",
          request,
          reason: "registration_unavailable",
        });
        set.status = 403;
        return { message: "Registration is not available for this application" };
      }
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (user) {
        await recordAuthUsage({
          policy,
          type: "signup",
          outcome: "denied",
          method: "magic_link",
          request,
          userId: user.id,
          reason: "user_already_exists",
        });
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
      await recordAuthUsage({
        policy,
        type: "signup",
        outcome: "success",
        method: "magic_link",
        request,
        reason: "magic_link_sent",
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
      const platformSettings = policy ? null : await getPlatformAuthSettings();
      if (
        (policy && !policy.application.signInMethods.includes("password")) ||
        (!policy && !platformSettings?.signInMethods.includes("password"))
      ) {
        await recordAuthUsage({
          policy,
          type: "login",
          outcome: "denied",
          method: "password",
          request,
          reason: "method_disabled",
        });
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
      if (!response.ok) {
        await recordAuthUsage({
          policy,
          type: "login",
          outcome: "denied",
          method: "password",
          request,
          reason: "credentials_rejected",
        });
        return response;
      }

      const result = (await response.clone().json()) as {
        token?: string;
        user?: { id?: string; emailVerified?: boolean };
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
        await recordAuthUsage({
          policy,
          type: "login",
          outcome: "denied",
          method: "password",
          request,
          userId: result.user?.id,
          reason: "email_verification_required",
        });
        set.status = 403;
        return {
          message: "Verify your email before signing in. We sent a new verification link.",
          requiresEmailVerification: true,
        };
      }

      await recordAuthUsage({
        policy,
        type: "login",
        outcome: "success",
        method: "password",
        request,
        userId: result.user?.id,
        reason: "authenticated",
      });
      return response;
    },
    { body: PasswordLoginDto },
  )
  .post(
    "/password/signup",
    async ({ body, request, set }) => {
      const callbackURL = resolveCallbackURL(body.callbackURL);
      const policy = await getApplicationPolicy(callbackURL);
      const platformSettings = policy ? null : await getPlatformAuthSettings();
      if (
        (policy &&
          (policy.application.status !== "active" ||
            policy.application.registrationMode === "closed" ||
            !policy.application.signUpMethods.includes("password"))) ||
        (!policy &&
          (platformSettings?.registrationMode === "closed" ||
            !platformSettings?.signUpMethods.includes("password")))
      ) {
        await recordAuthUsage({
          policy,
          type: "signup",
          outcome: "denied",
          method: "password",
          request,
          reason: "registration_unavailable",
        });
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
      if (!signupResponse.ok) {
        await recordAuthUsage({
          policy,
          type: "signup",
          outcome: "denied",
          method: "password",
          request,
          reason: "signup_rejected",
        });
        return signupResponse;
      }
      const signupResult = (await signupResponse.clone().json()) as {
        user?: { id?: string };
      };
      await recordAuthUsage({
        policy,
        type: "signup",
        outcome: "success",
        method: "password",
        request,
        userId: signupResult.user?.id,
        reason: "account_created",
      });

      if (policy?.application.passwordEmailVerificationRequired ?? true) {
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
