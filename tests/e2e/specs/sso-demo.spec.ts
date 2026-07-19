import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";
import { readRunState } from "../helpers/run-state";

test("SSO demo creates and clears a verified local session", async ({ browser }) => {
  const fixture = readRunState().oauthFixture;
  if (!fixture) throw new Error("OAuth E2E fixture was not provisioned");

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto(`${e2eEnv.E2E_DEMO_ORIGIN}/?client_id=${encodeURIComponent(fixture.clientId)}`);
    await expect(page.getByRole("heading", { name: /whole SSO contract/i })).toBeVisible();
    await page.getByRole("link", { name: "Continue with SSO" }).click();

    await expect(page).toHaveURL(/\/application\/login\?/);
    await expect(page.getByRole("heading", { name: `Continue to E2E OAuth Client ${e2eEnv.runId}` })).toBeVisible();
    const passwordForm = page.getByRole("form", { name: "Password sign in" });
    await passwordForm.getByLabel("Email", { exact: true }).fill(e2eEnv.E2E_ACTOR_EMAIL);
    await passwordForm.getByLabel("Password", { exact: true }).fill(e2eEnv.E2E_ACTOR_PASSWORD);
    await passwordForm.getByRole("button", { name: "Sign in with password" }).click();

    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/dashboard?connected=true`);
    await expect(page.getByText("Verified session", { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.applicationId, { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.clientId, { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.memberId, { exact: true })).toBeVisible();
    expect(page.url()).not.toMatch(/(?:access_token|id_token|code)=/);
    expect(await page.evaluate(() => ({
      localAccessToken: localStorage.getItem("access_token"),
      localIdToken: localStorage.getItem("id_token"),
      sessionAccessToken: sessionStorage.getItem("access_token"),
      sessionIdToken: sessionStorage.getItem("id_token"),
    }))).toEqual({
      localAccessToken: null,
      localIdToken: null,
      sessionAccessToken: null,
      sessionIdToken: null,
    });

    await page.reload();
    await expect(page.getByText("Verified session", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sign out locally" }).click();
    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/`);
    await expect(page.getByRole("link", { name: "Continue with SSO" })).toBeVisible();
  } finally {
    await context.close();
  }
});
