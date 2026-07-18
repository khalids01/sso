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
      "/token",
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

  it("uses only the guarded RS256 JWKS signer for OAuth tokens", async () => {
    const authInstancePath = new URL(
      "../../../packages/auth/src/auth-instance.server.ts",
      import.meta.url,
    );
    const tokenControllerPath = new URL(
      "../src/modules/oauth/oauth-token.controller.ts",
      import.meta.url,
    );
    const [authSource, controllerSource] = await Promise.all([
      Bun.file(authInstancePath).text(),
      Bun.file(tokenControllerPath).text(),
    ]);

    expect(authSource).toContain('keyPairConfig: { alg: "RS256", modulusLength: 2048 }');
    expect(authSource).toContain("disableSettingJwtHeader: true");
    expect(authSource).toContain("rotationInterval: 60 * 60 * 24 * 30");
    expect(authSource).toContain("gracePeriod: 60 * 60 * 24");
    expect(authSource).toContain("oauthAuthServerConfig: true");
    expect(authSource).toContain("openidConfig: true");
    expect(authSource).toContain(
      'loginPage: `${env.CORS_ORIGIN}/application/login`',
    );
    expect(authSource).toContain(
      'page: `${env.CORS_ORIGIN}/application/signup`',
    );
    expect(authSource).toContain("allowPublicClientPrelogin: true");
    expect(controllerSource).toContain("env.ENABLE_OAUTH_TOKEN_ISSUANCE");
  });

  it("pins matched stable Better Auth packages", async () => {
    const repoRoot = new URL("../../..", import.meta.url);
    const files = [
      "package.json",
      "packages/auth/package.json",
      "apps/server/package.json",
      "apps/web/package.json",
      "tests/e2e/package.json",
    ];

    for (const file of files) {
      const manifest = await Bun.file(new URL(file, repoRoot)).json() as {
        dependencies?: Record<string, string>;
        workspaces?: { catalog?: Record<string, string> };
      };
      const betterAuth =
        manifest.dependencies?.["better-auth"] ??
        manifest.workspaces?.catalog?.["better-auth"];
      expect(betterAuth).toBe("1.6.23");
      if (manifest.dependencies?.["@better-auth/oauth-provider"]) {
        expect(manifest.dependencies["@better-auth/oauth-provider"]).toBe(
          "1.6.23",
        );
      }
    }
  });
});
