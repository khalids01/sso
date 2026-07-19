import { afterEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const findUniqueMock = mock(async () => null);
const applicationClientFindUniqueMock = mock(async () => null);
const activityCreateMock = mock(async () => ({ id: "activity-1" }));
const authApi =
  ((globalThis as typeof globalThis & {
    __serverTestAuthApi?: {
      getSession: ReturnType<typeof mock>;
      signInMagicLink: ReturnType<typeof mock>;
      signInEmail: ReturnType<typeof mock>;
      signUpEmail: ReturnType<typeof mock>;
      sendVerificationEmail: ReturnType<typeof mock>;
    };
  }).__serverTestAuthApi ??= {
    getSession: mock(async () => null),
    signInMagicLink: mock(async () => ({ success: true })),
    signInEmail: mock(async () => new Response()),
    signUpEmail: mock(async () => new Response()),
    sendVerificationEmail: mock(async () => ({ status: true })),
  });
const sessionDeleteManyMock = mock(async () => ({ count: 1 }));

mock.module("@db/server", () => ({
  default: {
    user: {
      findUnique: findUniqueMock,
    },
    activityEvent: {
      create: activityCreateMock,
    },
    applicationClient: {
      findUnique: applicationClientFindUniqueMock,
    },
    session: {
      deleteMany: sessionDeleteManyMock,
    },
  },
  Prisma,
}));

mock.module("@auth/server", () => ({
  auth: {
    api: authApi,
  },
  getAuthSession: mock(async () => null),
  getPolarCustomerState: mock(async () => null),
}));

mock.module("@env/server", () => ({
  env: {
    CORS_ORIGIN: "http://localhost:5002",
    ENABLE_PASSWORD_AUTH: true,
    SMTP_HOST: "smtp.example.com",
    EMAIL: "sso@example.com",
    EMAIL_PASSWORD: "test-password",
  },
}));

afterEach(() => {
  findUniqueMock.mockReset();
  activityCreateMock.mockReset();
  authApi.signInMagicLink.mockReset();
  authApi.signInEmail.mockReset();
  authApi.signUpEmail.mockReset();
  authApi.sendVerificationEmail.mockReset();
  sessionDeleteManyMock.mockReset();
  applicationClientFindUniqueMock.mockReset();
});

describe("authController", () => {
  it("returns 400 when magic-link login is requested for an unknown user", async () => {
    findUniqueMock.mockResolvedValue(null);

    const { authController } = await import("../src/modules/auth/auth.controller");

    const response = await authController.handle(
      new Request("http://localhost/auth/magic-link/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: "missing@example.com",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ message: "User not found" });
    expect(authApi.signInMagicLink).not.toHaveBeenCalled();
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(activityCreateMock).toHaveBeenCalledTimes(1);
    const serializedEvent = JSON.stringify(activityCreateMock.mock.calls[0]);
    expect(serializedEvent).toContain("auth.login.denied");
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
