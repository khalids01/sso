import { afterEach, describe, expect, it, mock } from "bun:test";
import { Elysia } from "elysia";
import { Permissions, RolePermissionMap, Roles } from "@rbac";
import { mockRedisModule } from "./helpers/mock-redis-module";

mockRedisModule();

const getSessionMock = mock(async () => ({
  user: {
    id: "admin-1",
    role: "ADMIN",
    banned: false,
    archived: false,
  },
}));

const getEffectivePermissionsMock = mock(async () =>
  new Set(RolePermissionMap[Roles.PlatformAdmin]),
);

mock.module("@auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

mock.module("../../src/rbac/resolve/get-effective.ts", () => ({
  getEffectivePermissions: getEffectivePermissionsMock,
  createPermissionChecker: (permissions: Set<string>) => (required: string) =>
    permissions.has(required),
}));

afterEach(() => {
  getSessionMock.mockClear();
  getEffectivePermissionsMock.mockClear();
});

describe("auth guard rbac integration", () => {
  it("derives permissions and enforces route permission", async () => {
    const { authGuard } = await import("../../src/guards/auth.guard");
    const { requirePermission } = await import(
      "../../src/rbac/guards/permissions.guard"
    );

    const app = new Elysia()
      .use(authGuard)
      .get(
        "/protected",
        ({ permissions }) => ({
          count: permissions?.size ?? 0,
        }),
        {
          beforeHandle: requirePermission(Permissions.AdminUsersList),
        },
      )
      .get("/forbidden", () => "ok", {
        beforeHandle: requirePermission(Permissions.AdminUsersGrantAdmin),
      });

    const allowed = await app.handle(
      new Request("http://localhost/protected"),
    );
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({
      count: RolePermissionMap[Roles.PlatformAdmin].length,
    });

    const denied = await app.handle(new Request("http://localhost/forbidden"));
    expect(denied.status).toBe(403);
  });
});
