import { describe, expect, it } from "bun:test";

describe("auth rate-limit config", () => {
  it("keeps session lifetime longer than the short cookie cache", async () => {
    const authConfigPath = new URL(
      "../../../packages/auth/src/auth-options.server.ts",
      import.meta.url,
    );
    const source = await Bun.file(authConfigPath).text();

    expect(source).toMatch(/expiresIn:\s*60\s*\*\s*60\s*\*\s*24\s*\*\s*30/);
    expect(source).toMatch(/updateAge:\s*60\s*\*\s*60\s*\*\s*24/);
    expect(source).toMatch(/maxAge:\s*5\s*\*\s*60/);
  });

  it("keeps Better Auth rate-limit enabled and magic-link limits explicit", async () => {
    const authConfigPath = new URL(
      "../../../packages/auth/src/auth-options.server.ts",
      import.meta.url,
    );
    const source = await Bun.file(authConfigPath).text();

    expect(source).toMatch(
      /rateLimit:\s*\{\s*enabled:\s*true,\s*window:\s*10,\s*max:\s*100,\s*\}/s,
    );
    expect(source).toMatch(
      /magicLink\(\{\s*rateLimit:\s*\{\s*window:\s*60,\s*max:\s*5,\s*\}/s,
    );
  });

  it("keeps password authentication gated and password signup disabled", async () => {
    const authConfigPath = new URL(
      "../../../packages/auth/src/auth-options.server.ts",
      import.meta.url,
    );
    const source = await Bun.file(authConfigPath).text();

    expect(source).toMatch(
      /emailAndPassword:\s*\{\s*enabled:\s*env\.ENABLE_PASSWORD_AUTH,\s*disableSignUp:\s*true,\s*requireEmailVerification:\s*true,\s*minPasswordLength:\s*15,\s*maxPasswordLength:\s*128/s,
    );
  });

  it("keeps OAuth token and provider-management paths disabled", async () => {
    const authConfigPath = new URL(
      "../../../packages/auth/src/auth-options.server.ts",
      import.meta.url,
    );
    const source = await Bun.file(authConfigPath).text();
    const disabledPaths = source.match(/disabledPaths:\s*\[([\s\S]*?)\]/)?.[1];

    expect(disabledPaths).toBeDefined();
    for (const path of [
      "/oauth2/token",
      "/oauth2/userinfo",
      "/oauth2/introspect",
      "/oauth2/revoke",
      "/oauth2/register",
      "/oauth2/create-client",
      "/.well-known/openid-configuration",
    ]) {
      expect(disabledPaths).toContain(`"${path}"`);
    }

    for (const path of [
      "/oauth2/authorize",
      "/oauth2/public-client",
      "/oauth2/continue",
      "/oauth2/consent",
    ]) {
      expect(disabledPaths).not.toContain(`"${path}"`);
    }
  });
});
