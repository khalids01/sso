import { describe, expect, it } from "bun:test";

describe("applications controller config", () => {
  it("protects application detail with the read permission", async () => {
    const controllerPath = new URL(
      "../src/modules/admin/applications/applications.controller.ts",
      import.meta.url,
    );
    const source = await Bun.file(controllerPath).text();
    const detailStart = source.indexOf('.get(\n          "/:id"');
    const detailEnd = source.indexOf('.patch(\n          "/:id"', detailStart);
    const detailRoute = source.slice(detailStart, detailEnd);

    expect(detailStart).toBeGreaterThan(-1);
    expect(detailEnd).toBeGreaterThan(detailStart);
    expect(detailRoute).toContain(
      "requirePermission(Permissions.AdminApplicationsRead)",
    );
    expect(detailRoute).toContain("adminApplicationsService.getById(id)");
  });
});
