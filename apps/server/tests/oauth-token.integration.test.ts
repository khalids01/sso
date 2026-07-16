import { describe, expect, it } from "bun:test";

describe("OAuth authorization-code token exchange", () => {
  it("issues app-scoped JWTs and atomically consumes codes", async () => {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "--env-file",
        ".env",
        "tests/fixtures/oauth-token-integration.ts",
      ],
      cwd: new URL("..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) throw new Error(stderr);

    const result = JSON.parse(stdout.trim().split("\n").at(-1)!);
    expect(typeof result.jwks.count).toBe("number");
    expect(result.jwks.count > 0).toBe(true);
    expect(result).toMatchObject({
      preflight: 204,
      preflightOrigin: "http://127.0.0.1:48621",
      preflightCredentials: "false",
      success: 200,
      cacheControl: "no-store",
      accessClaims: {
        sub: expect.any(String),
        aud: expect.stringContaining("urn:sso:application:"),
        azp: expect.stringContaining("sso_client_token_test_"),
        scope: "openid",
        applicationId: expect.any(String),
        membershipId: expect.any(String),
        authorizationVersion: 1,
        hasPlatformPermissions: false,
      },
      idClaims: {
        sub: expect.any(String),
        aud: expect.stringContaining("sso_client_token_test_"),
        nonce: "nonce-1",
      },
      refreshTokenPresent: false,
      resourceIndicator: 400,
      concurrent: [200, 400],
      wrongVerifier: 400,
      afterWrongVerifier: 400,
      expired: 400,
      wrongRedirect: 400,
      wrongClient: 400,
      inactiveStatuses: {
        client: 400,
        application: 400,
        membership: 400,
        user: 400,
        session: 400,
      },
      unregisteredPreflight: 403,
      pairwiseSubjectStable: true,
      jwks: {
        status: 200,
        hasPrivateMaterial: false,
        algorithms: expect.arrayContaining(["RS256"]),
      },
    });
  }, 30_000);
});
