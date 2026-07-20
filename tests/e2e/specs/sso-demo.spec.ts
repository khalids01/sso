import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";
import { readRunState, updateRunState } from "../helpers/run-state";

function buildSignupEmail() {
  const [mailbox, domain] = e2eEnv.E2E_ACTOR_EMAIL.split("@");
  if (!mailbox || !domain) throw new Error("E2E actor email is invalid");
  return `${mailbox.split("+")[0]}+${e2eEnv.runPrefix}signup@${domain}`;
}

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

test("SSO demo signs up with a password without email verification", async ({ browser }) => {
  const fixture = readRunState().oauthFixture;
  if (!fixture) throw new Error("OAuth E2E fixture was not provisioned");
  const signupEmail = buildSignupEmail();
  updateRunState((state) => {
    state.signupUserEmail = signupEmail;
  });

  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  try {
    await page.goto(`${e2eEnv.E2E_DEMO_ORIGIN}/?client_id=${encodeURIComponent(fixture.clientId)}`);
    await page.getByRole("link", { name: "Continue with SSO" }).click();
    await page.getByRole("link", { name: "Need an account? Sign Up" }).click();

    await expect(page).toHaveURL(/\/application\/signup\?/);
    const signupForm = page.getByRole("form", { name: "Password signup" });
    await signupForm.getByLabel("Name", { exact: true }).fill(`E2E Signup ${e2eEnv.runId}`);
    await signupForm.getByLabel("Email", { exact: true }).fill(signupEmail);
    await signupForm.getByLabel("Password", { exact: true }).fill(`E2E-signup-${e2eEnv.runId}!`);
    await signupForm.getByRole("button", { name: "Create account with password" }).click();

    await expect(page).toHaveURL(`${e2eEnv.E2E_DEMO_ORIGIN}/dashboard?connected=true`);
    await expect(page.getByText("Verified session", { exact: true })).toBeVisible();
    await expect(page.getByText(fixture.applicationId, { exact: true })).toBeVisible();

    const { default: prisma } = await import("../../../packages/db/src/client.server");
    try {
      const user = await prisma.user.findUnique({
        where: { email: signupEmail },
        select: {
          emailVerified: true,
          applicationMemberships: {
            where: { applicationId: fixture.applicationId },
            select: { status: true },
          },
        },
      });
      expect(user).toEqual({
        emailVerified: false,
        applicationMemberships: [{ status: "active" }],
      });
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    await context.close();
  }
});
