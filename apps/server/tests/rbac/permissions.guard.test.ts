import { describe, expect, it } from "bun:test";
import { Permissions } from "@rbac";
import { requirePermission } from "../../src/rbac/guards/permissions.guard";

describe("permissions guard", () => {
  it("returns 401 when permissions are missing", async () => {
    const ctx = {
      set: { status: 200 },
      user: { role: "USER" },
    } as any;

    const result = await requirePermission(Permissions.AdminAccess)(ctx);
    expect(ctx.set.status).toBe(401);
    expect(result).toEqual({ message: "Unauthorized", status: 401 });
  });

  it("returns 403 when permission is missing", async () => {
    const ctx = {
      set: { status: 200 },
      user: { role: "USER" },
      permissions: new Set([Permissions.FeedbackSubmit]),
    } as any;

    const result = await requirePermission(Permissions.AdminAccess)(ctx);
    expect(ctx.set.status).toBe(403);
    expect(result).toEqual({ message: "Forbidden", status: 403 });
  });

  it("allows request when permission exists", async () => {
    const ctx = {
      set: { status: 200 },
      user: { role: "ADMIN" },
      permissions: new Set([Permissions.AdminAccess]),
    } as any;

    const result = await requirePermission(Permissions.AdminAccess)(ctx);
    expect(result).toBeUndefined();
  });

  it("rejects banned users before permission checks", async () => {
    const ctx = {
      set: { status: 200 },
      user: { role: "ADMIN", banned: true },
      permissions: new Set([Permissions.AdminAccess]),
    } as any;

    const result = await requirePermission(Permissions.AdminAccess)(ctx);
    expect(ctx.set.status).toBe(403);
    expect(result).toEqual({ message: "Account is banned", status: 403 });
  });
});
