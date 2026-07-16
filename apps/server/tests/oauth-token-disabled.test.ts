import { describe, expect, it } from "bun:test";

describe("OAuth token issuance deployment gate", () => {
  it("returns 404 when token issuance is disabled", async () => {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "--env-file",
        ".env",
        "-e",
        `
          const { oauthTokenController } = await import("./src/modules/oauth/oauth-token.controller.ts");
          const response = await oauthTokenController.handle(new Request(
            "http://localhost:5001/api/auth/oauth2/token",
            { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=authorization_code" },
          ));
          console.log(response.status);
        `,
      ],
      cwd: new URL("..", import.meta.url).pathname,
      env: { ...process.env, ENABLE_OAUTH_TOKEN_ISSUANCE: "false" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) throw new Error(stderr);
    expect(stdout.trim().split("\n").at(-1)).toBe("404");
  });
});
