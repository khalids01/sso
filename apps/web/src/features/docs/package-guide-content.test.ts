import { describe, expect, test } from "bun:test";

import { packageRecipes } from "./package-guide-content";

const frameworkTabs = ["TanStack Start", "Next.js", "Elysia", "Express", "NestJS"];

describe("SSO integration guide", () => {
  test("documents server configuration once without browser env copies", () => {
    const guide = JSON.stringify(packageRecipes);
    expect(guide).not.toContain("process.env");
    expect(guide).not.toContain("VITE_SSO_CLIENT_ID");
    expect(guide).not.toContain("NEXT_PUBLIC_SSO_CLIENT_ID");
    expect(guide).toContain("Client environment (not needed)");
    expect(guide).toContain("VITE_SKYCANVAS_*");
    expect(guide).toContain("NEXT_PUBLIC_SKYCANVAS_*");
    expect(guide).not.toContain("createSsoBetterAuthProvider");
    expect(guide).not.toContain("createSsoBetterAuthClient");
    expect(guide).not.toContain("initialSession");
    expect(guide).toContain("createSsoBetterAuthIntegration");
    expect(guide).toContain("createSsoBetterAuthReact");
  });

  test("shows the required providers and every supported framework", () => {
    const react = JSON.stringify(packageRecipes.react);
    const better = JSON.stringify(packageRecipes.better);
    const standalone = JSON.stringify(packageRecipes.manual);
    expect(better).toContain("<SsoProvider bootstrap={bootstrap}>");
    expect(react).toContain("publishableKey={import.meta.env.VITE_SKYCANVAS_PUBLISHABLE_KEY}");
    expect(react).toContain("createSsoAccessTokenVerifier");
    expect(react).not.toContain("createSsoServer");
    expect(standalone).toContain("<SkyCanvasProvider>");
    expect(standalone).toContain("createTanStackSso");
    expect(standalone).toContain("interactionMode");
    expect(standalone).not.toContain("better-auth");
    expect(better).not.toContain("Add the React session provider");
    expect(standalone).not.toContain("Add SsoProvider for React");
    for (const framework of frameworkTabs) expect(better).toContain(framework);
  });
});
