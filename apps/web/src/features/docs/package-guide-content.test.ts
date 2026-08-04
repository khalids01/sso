import { describe, expect, test } from "bun:test";

import { packageRecipes } from "./package-guide-content";

const frameworkTabs = ["TanStack Start", "Next.js", "Elysia", "Express", "NestJS"];

describe("SSO integration guide", () => {
  test("documents server configuration once without browser env copies", () => {
    const guide = JSON.stringify(packageRecipes);
    expect(guide).not.toContain("process.env");
    expect(guide).not.toContain("VITE_SSO_CLIENT_ID");
    expect(guide).not.toContain("NEXT_PUBLIC_SSO_CLIENT_ID");
    expect(guide).not.toContain("createSsoBetterAuthProvider");
    expect(guide).not.toContain("createSsoBetterAuthClient");
    expect(guide).not.toContain("initialSession");
    expect(guide).toContain("createSsoBetterAuthIntegration");
    expect(guide).toContain("createSsoBetterAuthReact");
  });

  test("shows the required providers and every supported framework", () => {
    const better = JSON.stringify(packageRecipes.better);
    const standalone = JSON.stringify(packageRecipes.manual);
    expect(better).toContain("<SsoProvider bootstrap={bootstrap}>");
    expect(standalone).toContain("<SsoProvider bootstrap={bootstrap}>");
    expect(better).not.toContain("Add the React session provider");
    expect(standalone).not.toContain("Add SsoProvider for React");
    for (const framework of frameworkTabs) {
      expect(standalone).toContain(`\"tabLabel\":\"${framework}\"`);
    }
  });
});
