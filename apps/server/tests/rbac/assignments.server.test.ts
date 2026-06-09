import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Roles } from "@rbac";

const findFirstMock = mock(async () => null as any);
const findUniqueMock = mock(async () => ({ id: "role-id" }));
const deleteManyMock = mock(async () => ({ count: 0 }));
const createMock = mock(async () => ({}));
const transactionMock = mock(async (operations: Promise<unknown>[]) =>
  Promise.all(operations),
);

mock.module("../../../../packages/db/src/client.server", () => ({
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

describe("assignUserRole", () => {
  beforeEach(() => {
    findFirstMock.mockClear();
    findUniqueMock.mockClear();
    deleteManyMock.mockClear();
    createMock.mockClear();
    transactionMock.mockClear();
    findUniqueMock.mockResolvedValue({ id: "role-id" });
    findFirstMock.mockResolvedValue(null);
  });

  it("blocks demoting an owner account", async () => {
    findFirstMock.mockResolvedValueOnce({
      role: { slug: Roles.PlatformOwner },
    });

    const { assignUserRole } = await import(
      "../../../../packages/db/src/rbac/assignments.server"
    );

    await expect(
      assignUserRole("user-1", Roles.PlatformUser),
    ).rejects.toThrow("Owner role cannot be changed");

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("blocks assigning owner role outside bootstrap", async () => {
    const { assignUserRole } = await import(
      "../../../../packages/db/src/rbac/assignments.server"
    );

    await expect(
      assignUserRole("user-1", Roles.PlatformOwner),
    ).rejects.toThrow("Owner role cannot be assigned except during bootstrap");

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("allows owner bootstrap assignment", async () => {
    const { assignUserRole } = await import(
      "../../../../packages/db/src/rbac/assignments.server"
    );

    await assignUserRole("user-1", Roles.PlatformOwner, {
      allowOwnerAssignment: true,
    });

    expect(transactionMock).toHaveBeenCalled();
    expect(deleteManyMock).toHaveBeenCalled();
    expect(createMock).toHaveBeenCalled();
  });
});
