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
});
