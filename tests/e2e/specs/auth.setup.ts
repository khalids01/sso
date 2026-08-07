import fs from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

import { acquireActorLock } from "../helpers/actor-lock";
import { resolveActorRole } from "../helpers/actor-role";
import type { SessionContext } from "../helpers/capabilities";
import { e2eEnv } from "../helpers/environment";
import { provisionE2EIdentities } from "../helpers/provision-actor";
import { provisionOAuthFixture } from "../helpers/provision-oauth-fixture";
import { assertApprovedRedirects } from "../helpers/safety";
import { updateRunState } from "../helpers/run-state";

setup("provision and authenticate the selected E2E actor", async ({ page }) => {
  await assertApprovedRedirects();
  const lockToken = await acquireActorLock();
  updateRunState((state) => {
    state.lockToken = lockToken;
  });

  const identities = await provisionE2EIdentities();
  await provisionOAuthFixture(identities.actorId, identities.memberId);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  const passwordForm = page.getByRole("form", { name: "Password sign in" });
  if (await passwordForm.isVisible()) {
    const emailInput = passwordForm.getByLabel("Email", { exact: true });
    const passwordInput = passwordForm.getByLabel("Password", { exact: true });

    await emailInput.fill(e2eEnv.E2E_ACTOR_EMAIL);
    await passwordInput.fill(e2eEnv.E2E_ACTOR_PASSWORD);
    await expect(emailInput).toHaveValue(e2eEnv.E2E_ACTOR_EMAIL);
    await expect(passwordInput).toHaveValue(e2eEnv.E2E_ACTOR_PASSWORD);

    await Promise.all([
      page.waitForURL(/\/dashboard(?:\?.*)?$/),
      passwordForm.getByRole("button", { name: "Sign in with password" }).click(),
    ]);
  } else {
    const authModulePath = ["../../../packages/auth/src/", "index.server"].join("");
    const { auth } = await import(authModulePath) as any;
    const signIn = await auth.api.signInEmail({
      body: {
        email: e2eEnv.E2E_ACTOR_EMAIL,
        password: e2eEnv.E2E_ACTOR_PASSWORD,
      },
      asResponse: true,
    });
    expect(signIn.ok, await signIn.text()).toBe(true);
    const cookies = signIn.headers.getSetCookie().map((value: string) => {
      const pair = value.split(";", 1)[0] ?? "";
      const separator = pair.indexOf("=");
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        url: e2eEnv.E2E_API_ORIGIN,
      };
    });
    await page.context().addCookies(cookies);
    await page.goto("/dashboard");
  }

  const response = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  expect(response.ok()).toBeTruthy();
  const session = (await response.json()) as SessionContext;
  expect(session.user.email).toBe(e2eEnv.E2E_ACTOR_EMAIL);
  expect(session.primaryRoleSlug).toBe(resolveActorRole(e2eEnv.E2E_ACTOR_ROLE));

  const authFile = path.join(e2eEnv.e2eRoot, ".state/auth.json");
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
