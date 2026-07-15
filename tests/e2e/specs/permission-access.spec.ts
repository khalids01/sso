import { Permissions } from "../../../packages/rbac/src/index";
import { test, expect } from "../fixtures/test";
import {
  deriveCapabilities,
  type SessionContext,
} from "../helpers/capabilities";
import { e2eEnv } from "../helpers/environment";

test("UI and API access follow the actor's effective permissions", async ({ page }, testInfo) => {
  const sessionResponse = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  expect(sessionResponse.ok()).toBeTruthy();
  const session = (await sessionResponse.json()) as SessionContext;
  const capabilities = deriveCapabilities(session);

  await testInfo.attach("capability-summary", {
    body: JSON.stringify(
      {
        role: session.primaryRoleSlug,
        permissions: session.permissions,
        capabilities,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "User menu" }).click();
  const adminLink = page.getByRole("menuitem", { name: "Admin Dashboard" });
  if (capabilities.accessAdmin) await expect(adminLink).toBeVisible();
  else await expect(adminLink).toHaveCount(0);
  await page.keyboard.press("Escape");

  const listResponse = await page.request.get(
    `${e2eEnv.E2E_API_ORIGIN}/admin/applications?page=1&limit=10&filter=current`,
  );
  expect(listResponse.status()).toBe(capabilities.accessAdmin && capabilities.readApplications ? 200 : 403);

  if (!capabilities.accessAdmin) {
    await page.goto("/admin/applications");
    await expect(page).toHaveURL(/\/dashboard$/);
    return;
  }

  await page.goto("/admin/applications");
  if (!capabilities.readApplications) {
    await expect(page.getByText("Failed to load applications.")).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  const createButton = page.getByRole("button", { name: "Create application" });
  if (capabilities.manageApplications) await expect(createButton).toBeVisible();
  else await expect(createButton).toHaveCount(0);

  if (!capabilities.manageApplications) {
    const deniedMutation = await page.request.post(
      `${e2eEnv.E2E_API_ORIGIN}/admin/applications`,
      {
        data: {
          name: "Forbidden E2E application",
          slug: `${e2eEnv.runPrefix}forbidden`,
          status: "active",
        },
      },
    );
    expect(deniedMutation.status()).toBe(403);
    expect(session.permissions).not.toContain(Permissions.AdminApplicationsManage);
  }
});
