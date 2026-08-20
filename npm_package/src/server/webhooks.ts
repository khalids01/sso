export const WEBHOOK_EVENT_TYPES = [
  "user.created",
  "user.updated",
  "user.deleted",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export interface WebhookUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  banned: boolean;
  archived: boolean;
}

export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: T;
}

export type UserCreatedEvent = WebhookEvent<WebhookUser> & { type: "user.created" };
export type UserUpdatedEvent = WebhookEvent<WebhookUser> & { type: "user.updated" };
export type UserDeletedEvent = WebhookEvent<{ id: string }> & { type: "user.deleted" };

export interface WebhookHandlers {
  "user.created"?: (event: UserCreatedEvent) => Promise<void> | void;
  "user.updated"?: (event: UserUpdatedEvent) => Promise<void> | void;
  "user.deleted"?: (event: UserDeletedEvent) => Promise<void> | void;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

function parseSignature(value: string | null) {
  if (!value) throw new WebhookVerificationError("Missing X-SSO-Signature header");
  const parts = Object.fromEntries(value.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
  const timestamp = Number(parts.t);
  if (!Number.isSafeInteger(timestamp) || !parts.v1) {
    throw new WebhookVerificationError("Invalid X-SSO-Signature header");
  }
  return { timestamp, signature: parts.v1 };
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

async function sign(secret: string, timestamp: number, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const input = new TextEncoder().encode(`${timestamp}.${body}`);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, input)));
}

function assertEvent(value: unknown): asserts value is WebhookEvent {
  if (!value || typeof value !== "object") throw new WebhookVerificationError("Webhook body must be an object");
  const event = value as Partial<WebhookEvent>;
  if (typeof event.id !== "string" || !WEBHOOK_EVENT_TYPES.includes(event.type as WebhookEventType) || typeof event.createdAt !== "string" || !("data" in event)) {
    throw new WebhookVerificationError("Webhook body has an invalid event envelope");
  }
}

export async function verifyWebhookEvent(
  request: Request,
  secret: string,
  options: { maxAgeSeconds?: number; now?: number } = {},
): Promise<WebhookEvent> {
  if (!secret) throw new WebhookVerificationError("Webhook secret is required");
  const { timestamp, signature } = parseSignature(request.headers.get("x-sso-signature"));
  const now = options.now ?? Math.floor(Date.now() / 1_000);
  if (Math.abs(now - timestamp) > (options.maxAgeSeconds ?? 300)) {
    throw new WebhookVerificationError("Webhook timestamp is outside the allowed age");
  }
  const body = await request.text();
  const expected = await sign(secret, timestamp, body);
  if (!constantTimeEqual(signature, expected)) throw new WebhookVerificationError("Webhook signature is invalid");
  let event: unknown;
  try { event = JSON.parse(body); } catch { throw new WebhookVerificationError("Webhook body is not valid JSON"); }
  assertEvent(event);
  return event;
}

export function createWebhookHandler(
  handlers: WebhookHandlers,
  options: { secret: string; maxAgeSeconds?: number; onUnhandled?: "ignore" | "reject" },
) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
    try {
      const event = await verifyWebhookEvent(request, options.secret, options);
      const handler = handlers[event.type] as ((event: WebhookEvent) => Promise<void> | void) | undefined;
      if (!handler) {
        if (options.onUnhandled === "reject") return Response.json({ error: "Unhandled webhook event" }, { status: 400 });
        return new Response(null, { status: 204 });
      }
      await handler(event);
      return new Response(null, { status: 204 });
    } catch (error) {
      const status = error instanceof WebhookVerificationError ? 400 : 500;
      return Response.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status });
    }
  };
}

/** Used by tests and non-SSO producers that implement the SkyCanvas webhook protocol. */
export async function createWebhookSignature(secret: string, timestamp: number, body: string) {
  return `t=${timestamp},v1=${await sign(secret, timestamp, body)}`;
}
