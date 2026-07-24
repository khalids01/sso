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

  it("keeps revocation reads and mutations behind application permissions", async () => {
    const controllerPath = new URL(
      "../src/modules/admin/applications/applications.controller.ts",
      import.meta.url,
    );
    const source = await Bun.file(controllerPath).text();
    const start = source.indexOf('.get(\n          "/:id/revocation"');
    const routes = source.slice(start);

    expect(start).toBeGreaterThan(-1);
    expect(routes).toContain(
      "requirePermission(Permissions.AdminApplicationsRead)",
    );
    expect(routes).toContain(
      "requirePermission(Permissions.AdminApplicationsManage)",
    );
    expect(routes).toContain("updateRevocationEndpoint");
    expect(routes).toContain("listRevocationDeliveries");
    expect(routes).toContain("retryRevocationDelivery");
  });

  it("returns structured policy errors without leaking unexpected failures", async () => {
    const controllerPath = new URL(
      "../src/modules/admin/applications/applications.controller.ts",
      import.meta.url,
    );
    const source = await Bun.file(controllerPath).text();

    expect(source).toContain("code: error.code");
    expect(source).toContain("message: error.message");
    expect(source).toContain('code: "APPLICATION_OPERATION_FAILED"');
    expect(source).not.toContain(
      'error instanceof Error ? error.message : "Application operation failed"',
    );
  });
});
