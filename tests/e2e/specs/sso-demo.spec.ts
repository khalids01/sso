import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";

async function submitEmbeddedPassword(page: Page) {
  await page.getByLabel("Email", { exact: true }).fill(e2eEnv.E2E_ACTOR_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(e2eEnv.E2E_ACTOR_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function submitHostedPassword(page: Page) {
  const form = page.getByRole("form", { name: "Password sign in" });
  await form.getByLabel("Email", { exact: true }).fill(e2eEnv.E2E_ACTOR_EMAIL);
  await form.getByLabel("Password", { exact: true }).fill(e2eEnv.E2E_ACTOR_PASSWORD);
  await form.getByRole("button", { name: "Sign in with password" }).click();
}

async function expectBetterAuthDashboard(page: Page) {
  await page.waitForURL((url) =>
    url.pathname === "/better-auth/dashboard" ||
    url.pathname === "/api/better-auth/error"
  );
  if (new URL(page.url()).pathname === "/api/better-auth/error") {
    const { default: prisma } = await import("../../../packages/db/src/client.server");
    try {
      const events = await prisma.applicationUsageEvent.findMany({
        where: { application: { slug: `${e2eEnv.runPrefix}consumer-auth` } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { type: true, outcome: true, reason: true },
      });
      throw new Error(`Better Auth callback failed: ${JSON.stringify(events)}`);
    } finally {
      await prisma.$disconnect();
    }
  }
  await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/better-auth/dashboard`);
}

test("Clerk-like package auth stays in the client app and survives logout then login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  const mainFrameOrigins: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && frame.url().startsWith("http")) {
      mainFrameOrigins.push(new URL(frame.url()).origin);
    }
  });

  try {
    await page.goto(`${e2eEnv.E2E_DEMO_ORIGIN}/standalone`);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await submitEmbeddedPassword(page);

    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/standalone/dashboard`);
    await expect(page.getByText("Standalone session", { exact: true })).toBeVisible();
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();
    expect(mainFrameOrigins.every((origin) => origin === e2eEnv.E2E_DEMO_ORIGIN)).toBe(true);

    await page.reload();
    await expect(page.getByText("Authenticated without Better Auth", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/standalone`);

    mainFrameOrigins.length = 0;
    await submitEmbeddedPassword(page);
    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/standalone/dashboard`);
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();
    expect(mainFrameOrigins.every((origin) => origin === e2eEnv.E2E_DEMO_ORIGIN)).toBe(true);
    expect(page.url()).not.toContain("state_mismatch");
  } finally {
    await context.close();
  }
});

test("Better Auth adapter creates its session and survives logout then login", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();

  try {
    await page.goto(`${e2eEnv.E2E_DEMO_ORIGIN}/better-auth`);
    await page.getByRole("button", { name: "Continue with Better Auth SSO" }).click();
    await expect(page).toHaveURL(/\/application\/login\?/);
    await expect(page.getByRole("heading", {
      name: `Continue to E2E Better Auth Client ${e2eEnv.runId}`,
    })).toBeVisible();
    await submitHostedPassword(page);

    await expectBetterAuthDashboard(page);
    await expect(page.getByText("Better Auth session", { exact: true })).toBeVisible();
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Authenticated through the Better Auth adapter", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/better-auth`);

    await page.getByRole("button", { name: "Continue with Better Auth SSO" }).click();
    await expect(page).toHaveURL(/\/application\/login\?/);
    await submitHostedPassword(page);
    await expectBetterAuthDashboard(page);
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();
    expect(page.url()).not.toContain("state_mismatch");
  } finally {
    await context.close();
  }
});
