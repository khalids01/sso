import { expect, test } from "bun:test";
import { createWebhookHandler, createWebhookSignature, verifyWebhookEvent } from "../src/server/webhooks.js";

const body = JSON.stringify({ id: "evt_1", type: "user.deleted", createdAt: "2026-08-20T00:00:00.000Z", data: { id: "user_1" } });

test("verifies a raw webhook payload", async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = await createWebhookSignature("secret", timestamp, body);
  const event = await verifyWebhookEvent(new Request("https://app.test/webhooks", { method: "POST", headers: { "x-sso-signature": signature }, body }), "secret", { now: timestamp });
  expect(event.type).toBe("user.deleted");
});

test("handler dispatches verified events", async () => {
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = await createWebhookSignature("secret", timestamp, body);
  let received = "";
  const handler = createWebhookHandler({ "user.deleted": (event) => { received = event.data.id; } }, { secret: "secret" });
  const response = await handler(new Request("https://app.test/webhooks", { method: "POST", headers: { "x-sso-signature": signature }, body }));
  expect(response.status).toBe(204);
  expect(received).toBe("user_1");
});
