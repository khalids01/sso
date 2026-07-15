import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../fixtures/test";
import {
  deriveCapabilities,
  type SessionContext,
} from "../helpers/capabilities";
import { e2eEnv } from "../helpers/environment";
import {
  trackApplication,
  trackClient,
  trackMembership,
} from "../helpers/resource-tracker";

async function openActions(page: Page, entityName: string) {
  await page.getByRole("button", { name: `Actions for ${entityName}` }).click();
}

async function confirmAction(page: Page, action: string) {
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: action, exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function createClient(page: Page, name: string) {
  await page.getByRole("button", { name: "Create client" }).click();
  const dialog = page.getByRole("dialog", { name: "Create client" });
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByPlaceholder("https://app.example.com/auth/callback").fill(
    `https://${e2eEnv.runId}.example.test/auth/callback`,
  );
  await dialog.getByPlaceholder("https://app.example.com", { exact: true }).fill(
    `https://${e2eEnv.runId}.example.test`,
  );
  await dialog.getByRole("button", { name: "Create client" }).click();
  await expect(page.getByText("Client created")).toBeVisible();
  await expect(page.getByLabel(`Client ${name}`)).toBeVisible();
}

async function grantMember(page: Page) {
  await page.getByRole("button", { name: "Grant access" }).click();
  const dialog = page.getByRole("dialog", { name: "Grant access" });
  await dialog.getByPlaceholder("Search users by name or email...").fill(
    e2eEnv.E2E_MEMBER_EMAIL,
  );
  await dialog.getByRole("button", { name: new RegExp(e2eEnv.E2E_MEMBER_EMAIL, "i") }).click();
  await dialog.getByRole("button", { name: "Grant access", exact: true }).click();
  await expect(page.getByText("Application access granted")).toBeVisible();
  await expect(page.getByLabel(`Member ${e2eEnv.E2E_MEMBER_EMAIL}`)).toBeVisible();
}

async function applicationRow(page: Page, name: string): Promise<Locator> {
  const row = page.getByLabel(`Application ${name}`);
  await expect(row).toBeVisible();
  return row;
}

test("manage the complete application, client, and membership lifecycle", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const sessionResponse = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  expect(sessionResponse.ok()).toBeTruthy();
  const session = (await sessionResponse.json()) as SessionContext;
  const capabilities = deriveCapabilities(session);
  test.skip(
    !capabilities.accessAdmin ||
      !capabilities.readApplications ||
      !capabilities.manageApplications,
    "The selected actor does not have the application management capability",
  );

  const attempt = testInfo.retry;
  const slug = `${e2eEnv.runPrefix}applications-${attempt}`;
  const initialName = `E2E Application ${e2eEnv.runId} ${attempt}`;
  const applicationName = `${initialName} Updated`;
  const firstClientName = `E2E Client ${e2eEnv.runId} ${attempt}`;
  const editedClientName = `${firstClientName} Updated`;
  const cleanupClientName = `E2E Cleanup Client ${e2eEnv.runId} ${attempt}`;
  let applicationId = "";

  await test.step("create, view, and edit an application", async () => {
    await page.goto("/admin/applications");
    await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
    await page.getByRole("button", { name: "Create application" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create application" });
    await createDialog.getByLabel("Name").fill(initialName);
    await createDialog.getByLabel("Slug").fill(slug);
    await createDialog.getByLabel("Description").fill("Run-owned Playwright application");
    await createDialog.getByRole("button", { name: "Create application" }).click();
    await expect(page.getByText("Application created")).toBeVisible();
    await applicationRow(page, initialName);
    applicationId = await trackApplication(slug);

    await openActions(page, initialName);
    await page.getByRole("menuitem", { name: "View" }).click();
    await expect(page.getByRole("dialog", { name: "Application details" })).toContainText(slug);
    await page.keyboard.press("Escape");

    await openActions(page, initialName);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit application" });
    await editDialog.getByLabel("Name").fill(applicationName);
    await editDialog.getByLabel("Description").fill("Updated by the Playwright E2E journey");
    await editDialog.getByRole("button", { name: "Save application" }).click();
    await expect(page.getByText("Application updated")).toBeVisible();
    await applicationRow(page, applicationName);
  });

  await test.step("create, view, edit, archive, restore, and delete a client", async () => {
    const row = await applicationRow(page, applicationName);
    await row.getByRole("link", { name: /clients/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/applications/${applicationId}/clients$`));
    await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: applicationName })).toBeVisible();

    await createClient(page, firstClientName);
    await trackClient(applicationId, firstClientName);
    await openActions(page, firstClientName);
    await page.getByRole("menuitem", { name: "View" }).click();
    await expect(page.getByRole("dialog", { name: "Client details" })).toContainText(firstClientName);
    await page.keyboard.press("Escape");

    await openActions(page, firstClientName);
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const editDialog = page.getByRole("dialog", { name: "Edit client" });
    await editDialog.getByLabel("Name").fill(editedClientName);
    await editDialog.getByRole("button", { name: "Save client" }).click();
    await expect(page.getByText("Client updated")).toBeVisible();
    await expect(page.getByLabel(`Client ${editedClientName}`)).toBeVisible();

    await openActions(page, editedClientName);
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await confirmAction(page, "Archive");
    await page.getByRole("button", { name: "Archived" }).click();
    await expect(page.getByLabel(`Client ${editedClientName}`)).toBeVisible();

    await openActions(page, editedClientName);
    await page.getByRole("menuitem", { name: "Restore" }).click();
    await confirmAction(page, "Restore");
    await page.getByRole("button", { name: "Current" }).click();
    await expect(page.getByLabel(`Client ${editedClientName}`)).toBeVisible();

    await openActions(page, editedClientName);
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await confirmAction(page, "Archive");
    await page.getByRole("button", { name: "Archived" }).click();
    await openActions(page, editedClientName);
    await page.getByRole("menuitem", { name: "Permanent delete" }).click();
    await confirmAction(page, "Permanent delete");
    await expect(page.getByLabel(`Client ${editedClientName}`)).toHaveCount(0);

    await page.getByRole("button", { name: "Current" }).click();
    await createClient(page, cleanupClientName);
    await trackClient(applicationId, cleanupClientName);
  });

  await test.step("grant, suspend, restore, revoke, restore, and delete membership", async () => {
    await page.getByRole("link", { name: "members", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/applications/${applicationId}/members$`));
    await page.reload();
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    await grantMember(page);
    await trackMembership(applicationId, e2eEnv.E2E_MEMBER_EMAIL);
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "View" }).click();
    await expect(page.getByRole("dialog", { name: "Member details" })).toContainText(
      e2eEnv.E2E_MEMBER_EMAIL,
    );
    await page.keyboard.press("Escape");

    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Suspend" }).click();
    await confirmAction(page, "Suspend");
    await expect(page.getByLabel(`Member ${e2eEnv.E2E_MEMBER_EMAIL}`)).toContainText("suspended");

    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Restore" }).click();
    await confirmAction(page, "Restore");
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Revoke" }).click();
    await confirmAction(page, "Revoke");

    await page.getByRole("button", { name: "Revoked" }).click();
    await expect(page.getByLabel(`Member ${e2eEnv.E2E_MEMBER_EMAIL}`)).toBeVisible();
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Restore" }).click();
    await confirmAction(page, "Restore");
    await page.getByRole("button", { name: "Current" }).click();
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Revoke" }).click();
    await confirmAction(page, "Revoke");
    await page.getByRole("button", { name: "Revoked" }).click();
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Permanent delete" }).click();
    await confirmAction(page, "Permanent delete");

    await page.getByRole("button", { name: "Current" }).click();
    await grantMember(page);
    await trackMembership(applicationId, e2eEnv.E2E_MEMBER_EMAIL);
  });

  await test.step("archive the application and enforce archived restrictions", async () => {
    await page.getByRole("link", { name: "Applications", exact: true }).click();
    await openActions(page, applicationName);
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await confirmAction(page, "Archive");
    await page.getByRole("button", { name: "Archived" }).click();
    const row = await applicationRow(page, applicationName);

    await row.getByRole("link", { name: /clients/ }).click();
    await expect(page.getByRole("button", { name: "Create client" })).toBeDisabled();
    await openActions(page, cleanupClientName);
    await expect(page.getByRole("menuitem", { name: "Edit" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Archive" }).click();
    await confirmAction(page, "Archive");
    await page.getByRole("button", { name: "Archived" }).click();
    await openActions(page, cleanupClientName);
    await page.getByRole("menuitem", { name: "Permanent delete" }).click();
    await confirmAction(page, "Permanent delete");

    await page.getByRole("link", { name: "members", exact: true }).click();
    await expect(page.getByRole("button", { name: "Grant access" })).toBeDisabled();
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Revoke" }).click();
    await confirmAction(page, "Revoke");
    await page.getByRole("button", { name: "Revoked" }).click();
    await openActions(page, e2eEnv.E2E_MEMBER_EMAIL);
    await page.getByRole("menuitem", { name: "Permanent delete" }).click();
    await confirmAction(page, "Permanent delete");
  });

  await test.step("permanently delete the archived application", async () => {
    await page.getByRole("link", { name: "Applications", exact: true }).click();
    await page.getByRole("button", { name: "Archived" }).click();
    await openActions(page, applicationName);
    await page.getByRole("menuitem", { name: "Permanent delete" }).click();
    await confirmAction(page, "Permanent delete");
    await expect(page.getByLabel(`Application ${applicationName}`)).toHaveCount(0);
  });
});
