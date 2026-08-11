import { describe, expect, test } from "bun:test";

describe("framework bootstrap adapters", () => {
  test("does not execute a TanStack server loader during module import", async () => {
    let calls = 0;
    const { getTanStackBetterAuthSsoBootstrap } = await import("../src/tanstack-start/index.js");
    expect(calls).toBe(0);

    await expect(getTanStackBetterAuthSsoBootstrap(async () => {
      calls += 1;
      return {} as never;
    })).rejects.toThrow("loader must return auth and skycanvas");
    expect(calls).toBe(1);
  });

  test("creates lazy Clerk-style middleware without loading server config", async () => {
    let calls = 0;
    const { createTanStackSsoMiddleware } = await import("../src/tanstack-start/index.js");
    const middleware = createTanStackSsoMiddleware(async () => {
      calls += 1;
      return {} as never;
    });
    expect(middleware).toBeDefined();
    expect(calls).toBe(0);
  });

  test("validates Next.js integrations before reading request headers", async () => {
    const { getNextBetterAuthSsoBootstrap, getNextStandaloneSsoBootstrap } =
      await import("../src/next/index.js");
    await expect(getNextBetterAuthSsoBootstrap({} as never)).rejects.toThrow(
      "Next.js Better Auth SSO bootstrap requires auth and skycanvas",
    );
    await expect(getNextStandaloneSsoBootstrap({} as never)).rejects.toThrow(
      "Next.js standalone SSO bootstrap requires an SsoServer",
    );
  });

  test("creates complete Next.js route handlers without reading request headers", async () => {
    const { createNextSso } = await import("../src/next/index.js");
    const integration = createNextSso({
      clientId: "client_next",
      appUrl: "https://next.example.com",
      baseUrl: "https://sso.example.com",
      sessionSecret: "test-session-secret-that-is-at-least-32-bytes",
    });

    expect(integration.handlers.GET).toBeFunction();
    expect(integration.handlers.POST).toBeFunction();
    expect(integration.handlers.OPTIONS).toBeFunction();
    expect(integration.sso.callbackUrl).toBe("https://next.example.com/auth/callback");
  });

  test("creates an Elysia plugin for native Web requests", async () => {
    const { createElysiaSso } = await import("../src/elysia/index.js");
    const plugin = createElysiaSso({
      handle: async () => Response.json({ ok: true }),
    } as never);

    const response = await plugin.handle(new Request("http://localhost/auth/profile"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
