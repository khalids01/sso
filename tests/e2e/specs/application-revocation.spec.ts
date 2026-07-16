import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { Permissions } from "../../../packages/rbac/src/index";
import { test, expect } from "../fixtures/test";
import { e2eEnv } from "../helpers/environment";
import { readRunState } from "../helpers/run-state";
import type { SessionContext } from "../helpers/capabilities";

test("deliver a signed pairwise revocation event to the application backend", async ({ page }) => {
  const fixture = readRunState().oauthFixture;
  if (!fixture) throw new Error("OAuth E2E fixture was not provisioned");
  const sessionResponse = await page.request.get(`${e2eEnv.E2E_API_ORIGIN}/session/context`);
  const session = (await sessionResponse.json()) as SessionContext;
  const canManage = session.permissions.includes(Permissions.AdminApplicationsManage);
  const canBan = session.permissions.includes(Permissions.AdminUsersBan);
  const revocationApi = `${e2eEnv.E2E_API_ORIGIN}/admin/applications/${fixture.applicationId}/revocation`;

  if (!canManage || !canBan) {
    const denied = await page.request.get(revocationApi);
    expect(denied.status()).toBe(403);
    await page.goto(`/admin/applications/${fixture.applicationId}/revocation`);
    await expect(page).toHaveURL(/\/dashboard$/);
    return;
  }

  await page.request.delete(`${e2eEnv.E2E_CALLBACK_ORIGIN}/revocations`);
  await page.goto(`/admin/applications/${fixture.applicationId}/revocation`);
  await expect(page.getByText("Revocation webhook", { exact: true })).toBeVisible();
  await page.getByLabel("Endpoint URL").fill(
    `${e2eEnv.E2E_CALLBACK_ORIGIN}/revocations`,
  );
  await page.getByRole("switch").click();
  await page.getByRole("button", { name: "Save webhook" }).click();
  await expect(page.getByText("Revocation webhook updated")).toBeVisible();

  const localSessions = new Set([fixture.revocationSubject]);
  try {
    const banned = await page.request.post(
      `${e2eEnv.E2E_API_ORIGIN}/admin/users/${fixture.revocationUserId}/ban`,
      { data: { reason: "E2E revocation verification" } },
    );
    expect(banned.ok()).toBeTruthy();

    let events: Array<{ eventId: string; token: string }> = [];
    await expect
      .poll(async () => {
        const response = await page.request.get(
          `${e2eEnv.E2E_CALLBACK_ORIGIN}/revocations`,
        );
        events = await response.json();
        return events.length;
      }, { timeout: 20_000 })
      .toBe(1);

    const jwksResponse = await page.request.get(
      `${e2eEnv.E2E_API_ORIGIN}/api/auth/jwks`,
    );
    const keySet = createLocalJWKSet((await jwksResponse.json()) as JSONWebKeySet);
    const verified = await jwtVerify(events[0]!.token, keySet, {
      issuer: e2eEnv.SSO_ISSUER,
      audience: `urn:sso:application:${fixture.applicationId}`,
      algorithms: ["RS256"],
    });
    expect(verified.payload).toMatchObject({
      jti: events[0]!.eventId,
      event_type: "application.access.revoked",
      reason: "user_banned",
      sub: fixture.revocationSubject,
      application_id: fixture.applicationId,
      membership_id: fixture.revocationMemberId,
      authorization_version: 2,
    });
    expect(verified.payload).not.toHaveProperty("user_id");
    expect(verified.payload).not.toHaveProperty("email");
    expect(verified.payload).not.toHaveProperty("permissions");
    expect(verified.payload).not.toHaveProperty("roles");

    localSessions.delete(String(verified.payload.sub));
    expect(localSessions.has(fixture.revocationSubject)).toBe(false);

    const replay = await page.request.post(
      `${e2eEnv.E2E_CALLBACK_ORIGIN}/revocations`,
      {
        headers: {
          "content-type": "application/jwt",
          "x-sso-event-id": events[0]!.eventId,
        },
        data: events[0]!.token,
      },
    );
    expect(replay.status()).toBe(204);
    const afterReplay = await page.request.get(
      `${e2eEnv.E2E_CALLBACK_ORIGIN}/revocations`,
    );
    expect((await afterReplay.json()) as unknown[]).toHaveLength(1);
  } finally {
    const unbanned = await page.request.post(
      `${e2eEnv.E2E_API_ORIGIN}/admin/users/${fixture.revocationUserId}/unban`,
    );
    expect(unbanned.ok()).toBeTruthy();
  }

  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByText("delivered", { exact: true })).toBeVisible();
});
