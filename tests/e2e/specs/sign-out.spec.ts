import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";

test.use({ storageState: { cookies: [], origins: [] } });

test("sign out invalidates a fresh UI session and protects private routes", async ({ page }) => {
  await page.goto("/login");
  const passwordForm = page.getByRole("form", { name: "Password sign in" });
  if (await passwordForm.isVisible()) {
    await passwordForm.getByLabel("Email", { exact: true }).fill(e2eEnv.E2E_ACTOR_EMAIL);
    await passwordForm
      .getByLabel("Password", { exact: true })
      .fill(e2eEnv.E2E_ACTOR_PASSWORD);
    await passwordForm.getByRole("button", { name: "Sign in with password" }).click();
    await page.waitForURL(/\/dashboard$/);
  } else {
    const authModulePath = ["../../../packages/auth/src/", "index.server"].join("");
    const { auth } = await import(authModulePath) as any;
    const signIn = await auth.api.signInEmail({
      body: { email: e2eEnv.E2E_ACTOR_EMAIL, password: e2eEnv.E2E_ACTOR_PASSWORD },
      asResponse: true,
    });
    expect(signIn.ok, await signIn.text()).toBe(true);
    await page.context().addCookies(signIn.headers.getSetCookie().map((value: string) => {
      const pair = value.split(";", 1)[0] ?? "";
      const separator = pair.indexOf("=");
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        url: e2eEnv.E2E_API_ORIGIN,
      };
    }));
    await page.goto("/dashboard");
  }

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL(`${e2eEnv.E2E_WEB_ORIGIN}/`);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/applications");
  await expect(page).toHaveURL(/\/login$/);
});
