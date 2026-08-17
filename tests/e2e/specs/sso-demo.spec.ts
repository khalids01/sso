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

test("embedded package auth creates a reload-safe app session", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto(e2eEnv.E2E_DEMO_ORIGIN);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await submitEmbeddedPassword(page);
    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/dashboard`);
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Authenticated with SkyCanvas SSO", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("hosted auth completes in a popup while the app remains on its origin", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto(e2eEnv.E2E_DEMO_ORIGIN);
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Continue in secure popup" }).click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/\/application\/login\?/);
    await expect(popup.getByRole("heading", {
      name: `Continue to E2E Clerk-like Client ${e2eEnv.runId}`,
    })).toBeVisible();
    await submitHostedPassword(popup);
    await popup.waitForEvent("close");

    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/dashboard`);
    await expect(page.getByText(e2eEnv.E2E_ACTOR_EMAIL, { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});
