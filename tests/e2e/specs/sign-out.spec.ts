import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";

test.use({ storageState: { cookies: [], origins: [] } });

test("sign out invalidates a fresh UI session and protects private routes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).first().fill(e2eEnv.E2E_ACTOR_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(e2eEnv.E2E_ACTOR_PASSWORD);
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await page.waitForURL(/\/dashboard$/);

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(`${e2eEnv.E2E_WEB_ORIGIN}/`);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/applications");
  await expect(page).toHaveURL(/\/login$/);
});
