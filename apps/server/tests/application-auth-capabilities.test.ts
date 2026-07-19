import { describe, expect, it } from "bun:test";

const baseEnv = {
  ...process.env,
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test",
  REDIS_URL: "redis://localhost:6379",
  BETTER_AUTH_SECRET: "test-secret-at-least-32-characters",
  BETTER_AUTH_URL: "http://localhost:5001",
  SSO_ISSUER: "http://localhost:5001/api/auth",
  CORS_ORIGIN: "http://localhost:5002",
  ENABLE_POLAR: "false",
  NODE_ENV: "test",
};

async function readCapabilities(
  env: Record<string, string | undefined>,
  configuredProviders: string[] = [],
) {
  const proc = Bun.spawn({
    cmd: [
      "bun",
      "-e",
      `import { getApplicationAuthCapabilities as get } from './packages/auth/src/lib/application-auth-capabilities.server.ts'; console.log(JSON.stringify(get(${JSON.stringify(configuredProviders)})));`,
    ],
    cwd: new URL("../../..", import.meta.url).pathname,
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(stderr);
  return JSON.parse(stdout.trim()) as Array<{
    id: string;
    available: boolean;
  }>;
}

describe("application authentication capabilities", () => {
  it("enables Google only when a client has saved credentials", async () => {
    const withoutCredentials = await readCapabilities(baseEnv);
    expect(withoutCredentials.find((item) => item.id === "google")?.available).toBe(false);

    const configured = await readCapabilities(baseEnv, ["google"]);
    expect(configured.find((item) => item.id === "google")?.available).toBe(
      true,
    );
  });

  it("keeps Instagram unavailable without an installed provider", async () => {
    const capabilities = await readCapabilities(baseEnv);
    expect(
      capabilities.find((item) => item.id === "instagram")?.available,
    ).toBe(false);
  });
});
