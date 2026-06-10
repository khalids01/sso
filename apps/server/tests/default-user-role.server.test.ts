import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Roles } from "@rbac";

const findFirstMock = mock(async () => null as any);
const findUniqueMock = mock(async () => ({ id: "role-id" }));
const deleteManyMock = mock(async () => ({ count: 0 }));
const createMock = mock(async () => ({}));
const transactionMock = mock(async (operations: Promise<unknown>[]) =>
  Promise.all(operations),
);

mock.module("../../../packages/db/src/client.server", () => ({
  default: {
    rbacUserRole: {
      findFirst: findFirstMock,
      deleteMany: deleteManyMock,
      create: createMock,
    },
    rbacRole: {
      findUnique: findUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

describe("defaultUserRoleOnSignup", () => {
  beforeEach(() => {
    findFirstMock.mockClear();
    findUniqueMock.mockClear();
    deleteManyMock.mockClear();
    createMock.mockClear();
    transactionMock.mockClear();
    findUniqueMock.mockResolvedValue({ id: "role-id" });
    findFirstMock.mockResolvedValue(null);
  });

  it("assigns platform.user after user create", async () => {
    const { defaultUserRoleOnSignup } = await import(
      "../../../packages/auth/src/lib/default-user-role.server.ts"
    );

    const plugin = defaultUserRoleOnSignup();
    const afterHook = plugin.init()?.options?.databaseHooks?.user?.create?.after;

    expect(afterHook).toBeDefined();
    await afterHook!({ id: "user-123", email: "test@example.com", name: "Test" });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { slug: Roles.PlatformUser },
      select: { id: true },
    });
    expect(transactionMock).toHaveBeenCalled();
  });

  it("does nothing when user id is missing", async () => {
    const { defaultUserRoleOnSignup } = await import(
      "../../../packages/auth/src/lib/default-user-role.server.ts"
    );

    const plugin = defaultUserRoleOnSignup();
    const afterHook = plugin.init()?.options?.databaseHooks?.user?.create?.after;

    await afterHook!({ email: "test@example.com", name: "Test" });

    expect(transactionMock).not.toHaveBeenCalled();
  });
});
