import { test, expect } from "../fixtures/test";
import { deriveCapabilities, type SessionContext } from "../helpers/capabilities";
import { e2eEnv } from "../helpers/environment";
import { updateRunState } from "../helpers/run-state";

type OAuthConnection = {
  id: string;
  name: string;
  provider: string;
  clientId: string;
  credentialVersion: number;
  status: string;
  applicationCount: number;
  accountCount: number;
  clientSecret?: string;
};

test("OAuth Manager lifecycle, assignments, client boundaries, and responsive UI", async ({
  page,
}) => {
  const sessionResponse = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  const session = (await sessionResponse.json()) as SessionContext;
  const capabilities = deriveCapabilities(session);
  test.skip(
    !capabilities.accessAdmin ||
      !capabilities.readOAuthConnections ||
      !capabilities.manageOAuthConnections ||
      !capabilities.readApplications ||
      !capabilities.manageApplications,
    "Requires OAuth Manager and application management permissions",
  );

  const name = `${e2eEnv.runPrefix}google`;
  const clientId = `${e2eEnv.runPrefix}google-client`;
  const secret = `${e2eEnv.runPrefix}google-secret`;
  const createResponse = await page.request.post(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections`,
    { data: { name, provider: "google", clientId, clientSecret: secret, status: "active" } },
  );
  expect(createResponse.status()).toBe(200);
  const connection = (await createResponse.json()) as OAuthConnection;
  expect(connection).toMatchObject({ name, provider: "google", clientId, status: "active" });
  expect(connection).not.toHaveProperty("clientSecret");
  updateRunState((state) => state.oauthConnectionIds.push(connection.id));

  const duplicateName = await page.request.post(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections`,
    {
      data: {
        name,
        provider: "google",
        clientId: `${clientId}-other`,
        clientSecret: secret,
      },
    },
  );
  expect(duplicateName.status()).toBe(409);

  const detailResponse = await page.request.get(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}`,
  );
  expect(await detailResponse.json()).not.toHaveProperty("clientSecret");
  const revealResponse = await page.request.get(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/secret`,
  );
  expect(await revealResponse.json()).toEqual({ clientSecret: secret });

  const updatedClientId = `${clientId}-updated`;
  const updateResponse = await page.request.patch(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}`,
    { data: { name, clientId: updatedClientId } },
  );
  const updated = (await updateResponse.json()) as OAuthConnection;
  expect(updated.clientId).toBe(updatedClientId);
  expect(updated.credentialVersion).toBe(connection.credentialVersion + 1);

  const slug = `${e2eEnv.runPrefix}oauth-app`;
  const applicationName = `${e2eEnv.runPrefix} OAuth application`;
  const appResponse = await page.request.post(
    `${e2eEnv.E2E_API_ORIGIN}/admin/applications`,
    {
      data: {
        name: applicationName,
        slug,
        status: "active",
        oauthConnections: { google: connection.id },
      },
    },
  );
  expect(appResponse.status()).toBe(200);
  const application = (await appResponse.json()) as {
    id: string;
    signInMethods: string[];
    signUpMethods: string[];
    oauthConnections: Array<Record<string, unknown>>;
    authCapabilities: Array<{ id: string; available: boolean; unavailableReason?: string }>;
  };
  updateRunState((state) => state.applicationIds.push(application.id));
  expect(application.signInMethods).toEqual([]);
  expect(application.signUpMethods).toEqual([]);
  expect(application.oauthConnections).toContainEqual(
    expect.objectContaining({
      id: connection.id,
      name,
      provider: "google",
      status: "active",
    }),
  );
  expect(JSON.stringify(application)).not.toContain(secret);

  const authSettingsResponse = await page.request.patch(
    `${e2eEnv.E2E_API_ORIGIN}/admin/applications/${application.id}`,
    {
      data: {
        signInMethods: ["password", "google"],
        signUpMethods: ["google"],
        registrationMode: "open",
        passwordEmailVerificationRequired: false,
      },
    },
  );
  expect(authSettingsResponse.status()).toBe(200);
  expect(await authSettingsResponse.json()).toMatchObject({
    signInMethods: ["password", "google"],
    signUpMethods: ["google"],
    registrationMode: "open",
  });

  await page.goto("/admin/applications");
  const applicationCard = page.getByLabel(`Application ${applicationName}`);
  await applicationCard
    .getByRole("button", { name: `Actions for ${applicationName}` })
    .click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const editApplicationDialog = page.getByRole("dialog", {
    name: "Edit application",
  });
  await expect(editApplicationDialog.getByLabel("Google")).toContainText(name);
  await editApplicationDialog
    .getByLabel("Description")
    .fill("Edited through the shared application form");
  await editApplicationDialog
    .getByRole("button", { name: "Save application" })
    .click();
  await expect(page.getByText("Application updated")).toBeVisible();
  const editedApplication = (await (
    await page.request.get(
      `${e2eEnv.E2E_API_ORIGIN}/admin/applications/${application.id}`,
    )
  ).json()) as {
    description: string;
    oauthConnections: Array<{ id: string }>;
  };
  expect(editedApplication.description).toBe(
    "Edited through the shared application form",
  );
  expect(editedApplication.oauthConnections).toContainEqual(
    expect.objectContaining({ id: connection.id }),
  );

  for (const suffix of ["one", "two"]) {
    const clientResponse = await page.request.post(
      `${e2eEnv.E2E_API_ORIGIN}/admin/applications/${application.id}/clients`,
      {
        data: {
          name: `${e2eEnv.runPrefix} client ${suffix}`,
          redirectUris: [`https://${suffix}.example.test/callback`],
          allowedOrigins: [`https://${suffix}.example.test`],
        },
      },
    );
    expect(clientResponse.status()).toBe(200);
    const client = (await clientResponse.json()) as Record<string, unknown>;
    expect(client).not.toHaveProperty("googleClientId");
    expect(client).not.toHaveProperty("googleClientSecret");
    expect(client).not.toHaveProperty("socialProviderCredentials");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/oauth-manager");
  await expect(page.getByRole("heading", { name: "OAuth Manager" })).toBeVisible();
  const card = page.getByText(name).locator("..").locator("..").locator("..");
  await expect(card.getByRole("button", { name: "View" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Archive" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await card.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog", { name: "Edit OAuth connection" })).toBeVisible();
  const clientIdInput = page.getByLabel("Client ID");
  await expect(clientIdInput).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Unlock credentials" }).click();
  await expect(clientIdInput).not.toHaveAttribute("readonly");
  await page.getByRole("button", { name: "Lock credentials" }).click();
  await expect(clientIdInput).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Reveal secret" }).click();
  await expect(page.getByLabel("Client secret")).toHaveValue(secret);
  await expect(page.getByText("Central callback URL")).toBeVisible();
  await page.keyboard.press("Escape");

  const archiveResponse = await page.request.post(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/archive`,
  );
  expect(archiveResponse.status()).toBe(200);
  const assignedArchived = (await (
    await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/admin/applications/${application.id}`)
  ).json()) as {
    oauthConnections: Array<{ id: string; status: string }>;
    authCapabilities: Array<{
      id: string;
      available: boolean;
      unavailableReason?: string;
    }>;
  };
  expect(assignedArchived.oauthConnections).toContainEqual(
    expect.objectContaining({ id: connection.id, status: "archived" }),
  );
  expect(assignedArchived.authCapabilities).toContainEqual(
    expect.objectContaining({
      id: "google",
      available: false,
      unavailableReason: expect.stringMatching(/archived|no longer available/i),
    }),
  );

  const assignedDelete = await page.request.delete(
    `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/permanent`,
  );
  expect(assignedDelete.status()).toBe(400);
  expect((await assignedDelete.text()).toLowerCase()).toMatch(/assigned|application/);

  expect(
    (
      await page.request.post(
        `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/restore`,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.patch(
        `${e2eEnv.E2E_API_ORIGIN}/admin/applications/${application.id}`,
        {
          data: {
            signInMethods: ["password"],
            signUpMethods: [],
            oauthConnections: { google: null },
          },
        },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(
        `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/archive`,
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.delete(
        `${e2eEnv.E2E_API_ORIGIN}/admin/oauth-connections/${connection.id}/permanent`,
      )
    ).status(),
  ).toBe(200);
});
