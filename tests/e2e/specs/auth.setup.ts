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
  await provisionOAuthFixture(identities.actorId);

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  const passwordForm = page.getByRole("form", { name: "Password sign in" });
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

  const response = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  expect(response.ok()).toBeTruthy();
  const session = (await response.json()) as SessionContext;
  expect(session.user.email).toBe(e2eEnv.E2E_ACTOR_EMAIL);
  expect(session.primaryRoleSlug).toBe(resolveActorRole(e2eEnv.E2E_ACTOR_ROLE));

  const authFile = path.join(e2eEnv.e2eRoot, ".state/auth.json");
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
