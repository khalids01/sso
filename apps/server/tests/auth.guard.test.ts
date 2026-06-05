import { describe, expect, it } from "bun:test";

async function runAuthGuardCase(sessionUser: Record<string, unknown>) {
  const proc = Bun.spawn({
    cmd: [
      "bun",
      "-e",
      `
        import { mock } from "bun:test";
        import { Elysia } from "elysia";

        mock.module("@auth/server", () => ({
          auth: {
            api: {
              getSession: mock(async () => ({
                user: ${JSON.stringify(sessionUser)},
                session: {
                  id: "session-1",
                  userId: ${JSON.stringify(sessionUser.id ?? "user-1")},
                  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
                  createdAt: new Date("2026-01-01T00:00:00.000Z"),
                  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
                  token: "token",
                },
                permissions: [],
                roles: [],
                primaryRoleSlug: "platform.user",
              })),
            },
          },
          getAuthSession: mock(async () => ({
            user: ${JSON.stringify(sessionUser)},
            session: {
              id: "session-1",
              userId: ${JSON.stringify(sessionUser.id ?? "user-1")},
              expiresAt: new Date("2099-01-01T00:00:00.000Z"),
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              token: "token",
            },
            permissions: [],
            roles: [],
            primaryRoleSlug: "platform.user",
          })),
        }));

        mock.module("@redis/server", () => ({
          getCache: mock(async () => null),
          setCache: mock(async () => undefined),
          deleteCache: mock(async () => undefined),
          connectRedis: mock(async () => ({
            get: mock(async () => null),
            set: mock(async () => "OK"),
            status: "ready",
          })),
          getRedis: () => ({ status: "wait" }),
        }));

        mock.module("./src/rbac/resolve/get-effective.ts", () => ({
          getEffectivePermissions: mock(async () => new Set()),
          createPermissionChecker: () => () => false,
        }));

        const { authGuard } = await import("./src/guards/auth.guard.ts");
        const app = new Elysia()
          .use(authGuard)
          .get("/protected", ({ userId }) => ({ userId }));

        const response = await app.handle(new Request("http://localhost/protected"));
        console.log(JSON.stringify({
          status: response.status,
          body: await response.json(),
        }));
      `,
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

  if (exitCode !== 0) {
    throw new Error(stderr);
  }

  return JSON.parse(stdout.trim()) as {
    status: number;
    body: unknown;
  };
}

describe("authGuard", () => {
  it("exposes session data for active users", async () => {
    const result = await runAuthGuardCase({
      id: "user-1",
      role: "USER",
      banned: false,
      archived: false,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ userId: "user-1" });
  });

  it("rejects banned users", async () => {
    const result = await runAuthGuardCase({
      id: "user-1",
      role: "USER",
      banned: true,
      archived: false,
    });

    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      message: "Account is banned",
      status: 403,
    });
  });

  it("rejects archived users", async () => {
    const result = await runAuthGuardCase({
      id: "user-1",
      role: "USER",
      banned: false,
      archived: true,
    });

    expect(result.status).toBe(403);
    expect(result.body).toEqual({
      message: "Account is archived",
      status: 403,
    });
  });
});
