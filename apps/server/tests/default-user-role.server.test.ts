import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Roles } from "@sso/rbac";

const assignUserRoleMock = mock(async () => undefined);

describe("defaultUserRoleOnSignup", () => {
  beforeEach(() => {
    assignUserRoleMock.mockClear();
  });

  it("assigns platform.user after user create", async () => {
    const { defaultUserRoleOnSignup } = await import(
      "../../../packages/auth/src/lib/default-user-role.server.ts"
    );

    const plugin = defaultUserRoleOnSignup(assignUserRoleMock);
    const afterHook = plugin.init()?.options?.databaseHooks?.user?.create?.after;

    expect(afterHook).toBeDefined();
    await afterHook!({ id: "user-123", email: "test@example.com", name: "Test" });

    expect(assignUserRoleMock).toHaveBeenCalledWith(
      "user-123",
      Roles.PlatformUser,
    );
  });

  it("does nothing when user id is missing", async () => {
    const { defaultUserRoleOnSignup } = await import(
      "../../../packages/auth/src/lib/default-user-role.server.ts"
    );

    const plugin = defaultUserRoleOnSignup(assignUserRoleMock);
    const afterHook = plugin.init()?.options?.databaseHooks?.user?.create?.after;

    await afterHook!({ email: "test@example.com", name: "Test" });

    expect(assignUserRoleMock).not.toHaveBeenCalled();
  });
});
