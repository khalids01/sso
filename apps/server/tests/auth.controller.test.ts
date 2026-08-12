import { afterEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const findUniqueMock = mock(async () => null);
const applicationClientFindUniqueMock = mock(async () => null);
const applicationClientFindFirstMock = mock(async () => null);
const usageCreateMock = mock(async () => ({ id: "usage-1" }));
const authApi =
  ((globalThis as typeof globalThis & {
    __serverTestAuthApi?: {
      getSession: ReturnType<typeof mock>;
      signInMagicLink: ReturnType<typeof mock>;
      signInEmail: ReturnType<typeof mock>;
      signUpEmail: ReturnType<typeof mock>;
      sendVerificationEmail: ReturnType<typeof mock>;
      signInSocial: ReturnType<typeof mock>;
      getOAuthClientPublicPrelogin: ReturnType<typeof mock>;
    };
  }).__serverTestAuthApi ??= {
    getSession: mock(async () => null),
    signInMagicLink: mock(async () => ({ success: true })),
    signInEmail: mock(async () => new Response()),
    signUpEmail: mock(async () => new Response()),
    sendVerificationEmail: mock(async () => ({ status: true })),
    signInSocial: mock(async () => new Response()),
    getOAuthClientPublicPrelogin: mock(async () => ({
      client_id: "sso_client_1",
    })),
  });
const sessionDeleteManyMock = mock(async () => ({ count: 1 }));
const setCacheMock = mock(async () => undefined);

mock.module("@sso/db/server", () => ({
  default: {
    user: {
      findUnique: findUniqueMock,
    },
    applicationUsageEvent: {
      create: usageCreateMock,
    },
    applicationClient: {
      findUnique: applicationClientFindUniqueMock,
      findFirst: applicationClientFindFirstMock,
    },
    session: {
      deleteMany: sessionDeleteManyMock,
    },
  },
  Prisma,
  getApplicationClientAccess: mock(async () => ({ allowed: true })),
  registerApplicationMemberIfAllowed: mock(async () => true),
}));

mock.module("@sso/auth/server", () => ({
  auth: {
    api: authApi,
  },
  getAuthSession: mock(async () => null),
  getPolarCustomerState: mock(async () => null),
  runWithOAuthProviderConnection: mock(
    (_connection: unknown, operation: () => unknown) => operation(),
  ),
  hashOAuthToken: (value: string) => value,
  isValidPkceVerifier: () => true,
  securelyMatchesChallenge: mock(async () => true),
  getAvailableApplicationAuthMethodIds: () => new Set(["magic_link", "password"]),
}));

mock.module("@sso/redis/server", () => ({
  setCache: setCacheMock,
  getCache: mock(async () => null),
  deleteCache: mock(async () => undefined),
  connectRedis: mock(async () => undefined),
  getRedis: () => ({ getdel: mock(async () => null) }),
}));

mock.module("@sso/env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:5002",
    ENABLE_PASSWORD_AUTH: true,
    SMTP_HOST: "smtp.example.com",
    EMAIL: "sso@example.com",
    EMAIL_PASSWORD: "test-password",
    BETTER_AUTH_SECRET: "test-better-auth-secret-that-is-long-enough",
    NODE_ENV: "test",
  },
}));

afterEach(() => {
  findUniqueMock.mockReset();
  usageCreateMock.mockReset();
  authApi.signInMagicLink.mockReset();
  authApi.signInEmail.mockReset();
  authApi.signUpEmail.mockReset();
  authApi.sendVerificationEmail.mockReset();
  authApi.signInSocial.mockReset();
  authApi.getOAuthClientPublicPrelogin.mockReset();
  sessionDeleteManyMock.mockReset();
  applicationClientFindUniqueMock.mockReset();
  applicationClientFindFirstMock.mockReset();
  setCacheMock.mockReset();
});

describe("authController", () => {
  it("allows embedded password requests only from the registered browser origin", async () => {
    applicationClientFindFirstMock.mockResolvedValue({
      id: "application-client-1",
      applicationId: "application-1",
      application: {
        signInMethods: ["password"],
        signUpMethods: ["password"],
        registrationMode: "open",
        passwordEmailVerificationRequired: false,
      },
    });
    authApi.signInEmail.mockResolvedValue(new Response(null, { status: 401 }));
    const { authController } = await import("../src/modules/auth/auth.controller");
    const response = await authController.handle(new Request(
      "http://localhost/auth/sdk/password/login",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://app.example.com",
        },
        body: JSON.stringify({
          clientId: "sso_client_1",
          redirectUri: "https://app.example.com/auth/callback",
          origin: "https://app.example.com",
          state: "state_value_that_is_long_enough",
          nonce: "nonce_value_that_is_long_enough",
          codeChallenge: "a".repeat(43),
          email: "user@example.com",
          password: "wrong-password",
        }),
      },
    ));

    expect(response.status).toBe(401);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("handles embedded-auth preflight for a registered application origin", async () => {
    applicationClientFindFirstMock.mockResolvedValue({ id: "application-client-1" });
    const { browserAuthCorsController } = await import(
      "../src/modules/auth/browser-auth-cors"
    );
    const response = await browserAuthCorsController.handle(new Request(
      "http://localhost/auth/sdk/password/login",
      { method: "OPTIONS", headers: { origin: "https://app.example.com" } },
    ));

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
  });

  it("starts social authentication with the application's assigned connection", async () => {
    authApi.getOAuthClientPublicPrelogin.mockResolvedValue({
      client_id: "sso_client_1",
    });
    applicationClientFindUniqueMock.mockResolvedValue({
      clientId: "sso_client_1",
      status: "active",
      oauthDisabled: false,
      application: {
        status: "active",
        signInMethods: ["google"],
        signUpMethods: ["google"],
        registrationMode: "open",
        passwordEmailVerificationRequired: true,
      },
    });
    const credentialsModule = await import(
      "../src/modules/auth/social-provider-credentials.service"
    );
    applicationClientFindFirstMock.mockResolvedValue({
      clientId: "sso_client_1",
      applicationId: "app-1",
      application: {
        oauthProviderConnections: [
          {
            oauthProviderConnection: {
              id: "google-connection-1",
              provider: "google",
              clientId: "google-client-id",
              encryptedSecret:
                credentialsModule.encryptSocialProviderSecret(
                  "google-client-secret",
                ),
              credentialVersion: 1,
              status: "active",
            },
          },
        ],
      },
    });
    authApi.signInSocial.mockResolvedValue(
      Response.json({
        url: "https://accounts.google.com/oauth?state=upstream-state",
        redirect: false,
      }),
    );
    const { authController } = await import("../src/modules/auth/auth.controller");
    const callbackURL =
      "http://localhost:5002/authorize?client_id=sso_client_1&state=signed";
    const response = await authController.handle(
      new Request("http://localhost/auth/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(setCacheMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await response.json())).not.toContain("google-client-secret");
    expect(authApi.signInSocial).toHaveBeenCalledTimes(1);
  });

  it("rejects social authentication when the signed continuation is invalid", async () => {
    authApi.getOAuthClientPublicPrelogin.mockRejectedValue(
      new Error("invalid signature"),
    );
    const { authController } = await import("../src/modules/auth/auth.controller");
    const response = await authController.handle(
      new Request("http://localhost/auth/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL:
            "http://localhost:5002/authorize?client_id=sso_client_1&sig=forged",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(authApi.signInSocial).not.toHaveBeenCalled();
  });

  it("returns 400 when magic-link login is requested for an unknown user", async () => {
    findUniqueMock.mockResolvedValue(null);
    applicationClientFindUniqueMock.mockResolvedValue({
      id: "application-client-1",
      applicationId: "application-1",
      status: "active",
      oauthDisabled: false,
      application: {
        status: "active",
        signInMethods: ["magic_link"],
        signUpMethods: ["magic_link"],
        registrationMode: "open",
        passwordEmailVerificationRequired: false,
      },
    });

    const { authController } = await import("../src/modules/auth/auth.controller");

    const response = await authController.handle(
      new Request("http://localhost/auth/magic-link/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "missing@example.com",
          callbackURL: "http://localhost:5002/authorize?client_id=sso_client_1",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ message: "User not found" });
    expect(authApi.signInMagicLink).not.toHaveBeenCalled();
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(usageCreateMock).toHaveBeenCalledTimes(1);
    const serializedEvent = JSON.stringify(usageCreateMock.mock.calls[0]);
    expect(serializedEvent).toContain("user_not_found");
    expect(serializedEvent).toContain("magic_link");
    expect(serializedEvent).not.toContain("missing@example.com");
  });

  it("rejects application magic-link signup when registration is closed", async () => {
    findUniqueMock.mockResolvedValue(null);
    applicationClientFindUniqueMock.mockResolvedValue({
      application: {
        status: "active",
        signInMethods: ["magic_link"],
        signUpMethods: ["magic_link"],
        registrationMode: "closed",
      },
    });
    const { authController } = await import("../src/modules/auth/auth.controller");
    const callbackURL =
      "http://localhost:5002/authorize?client_id=sso_client_test";
    const response = await authController.handle(
      new Request("http://localhost/auth/magic-link/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          name: "New User",
          callbackURL,
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "Registration is not available for this application",
    });
    expect(authApi.signInMagicLink).not.toHaveBeenCalled();
  });

  it("creates a password account and sends verification when required", async () => {
    applicationClientFindUniqueMock.mockResolvedValue({
      application: {
        status: "active",
        signInMethods: ["password"],
        signUpMethods: ["password"],
        registrationMode: "open",
        passwordEmailVerificationRequired: true,
      },
    });
    authApi.signUpEmail.mockResolvedValue(
      new Response(JSON.stringify({ token: null, user: { id: "user-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    authApi.sendVerificationEmail.mockResolvedValue({ status: true });

    const { authController } = await import("../src/modules/auth/auth.controller");
    const response = await authController.handle(
      new Request("http://localhost/auth/password/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          name: "New User",
          password: "a-secure-password-value",
          callbackURL:
            "http://localhost:5002/authorize?client_id=sso_client_test",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      requiresEmailVerification: true,
    });
    expect(authApi.signUpEmail).toHaveBeenCalledTimes(1);
    expect(authApi.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("does not create a password session for an unverified required email", async () => {
    applicationClientFindUniqueMock.mockResolvedValue({
      application: {
        status: "active",
        signInMethods: ["password"],
        signUpMethods: ["password"],
        registrationMode: "open",
        passwordEmailVerificationRequired: true,
      },
    });
    authApi.signInEmail.mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "session-token",
          user: { emailVerified: false },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    authApi.sendVerificationEmail.mockResolvedValue({ status: true });

    const { authController } = await import("../src/modules/auth/auth.controller");
    const response = await authController.handle(
      new Request("http://localhost/auth/password/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "a-secure-password-value",
          callbackURL:
            "http://localhost:5002/authorize?client_id=sso_client_test",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(sessionDeleteManyMock).toHaveBeenCalledWith({
      where: { token: "session-token" },
    });
    expect(authApi.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("signs in immediately after password signup when verification is optional", async () => {
    applicationClientFindUniqueMock.mockResolvedValue({
      application: {
        status: "active",
        signInMethods: ["password"],
        signUpMethods: ["password"],
        registrationMode: "open",
        passwordEmailVerificationRequired: false,
      },
    });
    authApi.signUpEmail.mockResolvedValue(
      new Response(JSON.stringify({ token: null, user: { id: "user-1" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    authApi.signInEmail.mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "session-token",
          user: { emailVerified: false },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { authController } = await import("../src/modules/auth/auth.controller");
    const response = await authController.handle(
      new Request("http://localhost/auth/password/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "new@example.com",
          name: "New User",
          password: "a-secure-password-value",
          callbackURL:
            "http://localhost:5002/authorize?client_id=sso_client_test",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(authApi.signInEmail).toHaveBeenCalledTimes(1);
    expect(authApi.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
