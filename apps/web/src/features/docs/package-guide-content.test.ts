import { describe, expect, test } from "bun:test";

import {
  integrationComparison,
  securityChecklist,
  troubleshootingItems,
} from "./integration-guide-content";
import { packageRecipes } from "./package-guide-content";

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
    expect(guide).toContain("skycanvasAuth");
    expect(guide).toContain("skycanvasClient");
    expect(guide).not.toContain("createSsoBetterAuthReact");
    expect(guide).toContain("signInWithSkyCanvas");
  });

  test("shows the required providers and every supported framework", () => {
    const react = JSON.stringify(packageRecipes.react);
    const better = JSON.stringify(packageRecipes.better);
    const standalone = JSON.stringify(packageRecipes.manual);
    expect(better).not.toContain("<SsoProvider bootstrap={bootstrap}>");
    expect(react).toContain("publishableKey={import.meta.env.VITE_SKYCANVAS_PUBLISHABLE_KEY}");
    expect(react).toContain("createSsoAccessTokenVerifier");
    expect(react).toContain("Bearer ");
    expect(react).toContain("wrong-audience tokens");
    expect(react).toContain("/auth/callback");
    expect(react).toContain("immediately opens a small secure loading screen");
    expect(react).toContain("No custom popup loading page is needed");
    expect(react).toContain("Add the ready-made user menu and profile");
    expect(react).toContain("SsoUserMenu");
    expect(react).toContain("built-in Profile dialog");
    expect(better).toContain("signInWithSkyCanvas");
    expect(standalone).toContain("immediate popup loading screen");
    expect(react).not.toContain("createSsoServer");
    expect(standalone).toContain("<SkyCanvasProvider>");
    expect(standalone).toContain("createTanStackSso");
    expect(standalone).toContain("interactionMode");
    expect(standalone).not.toContain("better-auth");
    expect(better).not.toContain("Add the React session provider");
    expect(standalone).not.toContain("Add SsoProvider for React");
    expect(better).toContain("TanStack Start");
    expect(better).toContain("Next.js");
  });

  test("explains session ownership, API enforcement, and common failures", () => {
    expect(integrationComparison).toHaveLength(4);
    expect(integrationComparison.some((row) => row.mode === "React-only" && row.appAuthServer === "No")).toBe(true);
    expect(integrationComparison.some((row) => row.credential.includes("HttpOnly"))).toBe(true);
    expect(securityChecklist.join(" ")).toContain("issuer, audience, signature, expiry, and subject");
    expect(troubleshootingItems.some((item) => item.problem.includes("Protected UI"))).toBe(true);
    expect(troubleshootingItems.some((item) => item.fix.includes("/auth/callback"))).toBe(true);
  });
});
