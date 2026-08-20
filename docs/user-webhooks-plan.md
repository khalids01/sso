# Webhook-Based User Event Delivery — Implementation Plan

This document is the pre-implementation architecture for adding `user.created`, `user.updated`, and `user.deleted` webhook delivery to the SSO. It is based on the actual codebase, not generic SSO assumptions.

**Scope clarification:** these webhooks notify *service applications* about users that belong to them. They are not about SSO platform/admin users. A platform-only admin user with no application association should not generate user webhooks.

---

## Goal

When a user that a service application cares about is created, updated, or deleted, the SSO must reliably deliver a signed webhook to that application. The `@skycanvasstudio/sso` package will provide receiver/verifier helpers, but it must never touch the service application's database.

```text
SSO Server
    ↓
Service-application user is created / updated / deleted
    ↓
SSO writes a webhook delivery job per subscribed application (same transaction)
    ↓
Background worker sends signed HTTP POST to each application endpoint
    ↓
@skycanvasstudio/sso/server verifies + routes the event
    ↓
Service application applies its own DB logic
```

---

## Application Scoping

A service application receives user webhooks only when it has a relationship to the user.

| Event | When it fires | Which applications receive it |
|-------|---------------|-------------------------------|
| `user.created` | A `User` row is created through an application sign-up flow, or an existing user is first associated with an application | The application the user signed up through; all applications where the user gains an active `ApplicationMember` |
| `user.updated` | Relevant user fields change | All applications where the user has an active `ApplicationMember` or `ApplicationSubject` |
| `user.deleted` | A `User` row is permanently deleted | All applications where the user had an active `ApplicationMember` or `ApplicationSubject` before deletion |

Platform-only users (e.g., an owner created from `packages/db/scripts/make-owner.ts` with no application membership) should not generate these webhooks.

The existing models that define the application/user relationship are:

- `ApplicationMember` (`packages/db/prisma/schema/applications.prisma`)
- `ApplicationSubject` (`packages/db/prisma/schema/applications.prisma`)

---

## 1. Current User Creation Flow

All user creation eventually goes through **Better Auth's Prisma adapter** (`prismaAdapter(...)` in `packages/auth/src/auth-options.server.ts`). There is no shared application-level `UserService`.

| Path | File | Mechanism | Application context |
|------|------|-----------|---------------------|
| Email/password signup (platform) | `apps/server/src/modules/auth/auth.controller.ts` `POST /password/signup` | `auth.api.signUpEmail` | Usually no application; may be platform-only |
| Email/password signup (embedded SDK) | `auth.controller.ts` `POST /sdk/password/signup` | `auth.api.signUpEmail` | Associated with `clientId` / application |
| Magic-link signup (platform) | `auth.controller.ts` `POST /magic-link/signup` | `auth.api.signInMagicLink` with `name` | Usually no application |
| Magic-link signup (embedded SDK) | `auth.controller.ts` `POST /sdk/magic-link` | `auth.api.signInMagicLink` with `name` | Associated with `clientId` / application |
| OAuth/social signup | `auth.controller.ts` `POST /social` → `auth.api.signInSocial` | Better Auth creates user on first sign-in. `overrideUserInfoOnSignIn: true` is set in `packages/auth/src/lib/dynamic-social-providers.server.ts` | Associated with `clientId` / application via social-provider context |
| Invitation acceptance | Better Auth handles the magic-link/invitation flow | User row created by adapter | May be associated with an application invitation (`ApplicationInvitation`) |
| Admin user creation | `apps/server/src/modules/admin/users/users.service.ts` `inviteUser()` | Creates `Invitation`, not `User` directly | No application unless later assigned |

The only existing `user.create.after` hook is `defaultUserRoleOnSignup()` in `packages/auth/src/lib/default-user-role.server.ts`, which assigns the platform `PlatformUser` role.

### Best trigger point for `user.created`

Add a new Better Auth plugin that registers `databaseHooks.user.create.after` in `packages/auth/src/auth-options.server.ts`. The hook must:

1. Build a safe user payload.
2. Resolve the application(s) the new user belongs to:
   - For embedded SDK sign-ups, the `clientId` is available in the request context; store it via AsyncLocalStorage or pass it through the OAuth/magic-link transaction context.
   - For application invitations, look up `ApplicationInvitation` by email.
   - If no application is found, do not enqueue any delivery.
3. Enqueue one `ApplicationWebhookDelivery` row per subscribed application endpoint.

---

## 2. Current User Update Flow

User updates are split across three layers. There is no centralized update service.

| Path | File | What changes |
|------|------|--------------|
| Better Auth internal flows | `packages/auth/src/auth-options.server.ts` | `emailVerified`, `name`/`image` from OAuth profile sync |
| Admin user update | `apps/server/src/modules/admin/users/users.service.ts` `updateUser()` | `name`; role change is handled separately via RBAC |
| Profile self-service | `apps/server/src/modules/profile/profile.service.ts` `runProfileAction("update_name")` | `name` |
| Polar billing | `packages/auth/src/lib/polar-customers.server.ts` | `subscriptionId`, `subscriptionStatus`, `polarCustomerId` |

`packages/auth/src/lib/polar-customers.server.ts` already demonstrates how to add a `databaseHooks.user.update.after` plugin.

### Best trigger point for `user.updated`

1. Use a Better Auth `databaseHooks.user.update.after` plugin to catch all Better-Auth-mediated updates (email verification, OAuth profile sync).
2. For non-Better-Auth paths, add an explicit enqueue call after the `prisma.user.update` succeeds in:
   - `apps/server/src/modules/admin/users/users.service.ts`
   - `apps/server/src/modules/profile/profile.service.ts`
3. In every path:
   - Compare the update against the webhook-visible field whitelist (`name`, `email`, `emailVerified`, `image`, `banned`, `archived`).
   - Skip if none of those fields changed.
   - Resolve all applications where the user is a member/subject and enqueue one delivery per subscribed endpoint.

---

## 3. Current User Deletion Flow

| Path | File | Mechanism |
|------|------|-----------|
| User self-delete | `apps/web/src/routes/_protected/settings.tsx` calls `authClient.deleteUser` | Better Auth delete-user endpoint |
| Admin permanent delete | `apps/server/src/modules/admin/users/users.service.ts` `deleteUserPermanent()` | Direct `prisma.user.delete` |

### Best trigger point for `user.deleted`

- Better Auth path: use `databaseHooks.user.delete.before` to capture the user row and resolve its application memberships/subjects before the row is removed.
- Admin path: capture the user and its memberships/subjects explicitly before `prisma.user.delete` in `deleteUserPermanent()`.

In both cases:
1. Resolve all applications where the user had a membership/subject.
2. Enqueue one `user.deleted` delivery per subscribed application endpoint with at minimum `{ id: user.id }`.
3. Write the delivery rows inside the same transaction as the user deletion so a rollback does not emit false events.

---

## 4. Existing Infrastructure to Reuse

The project already has a complete, production-grade revocation webhook worker. Copy its shape, but keep the new user-webhook system separate because payloads, audience, and signing are different.

| Component | Location | Purpose |
|-----------|----------|---------|
| Worker + retry logic | `apps/server/src/modules/application-revocation/revocation.service.ts` | Full delivery pipeline with leases, backoff, dead-lettering |
| Schema | `packages/db/prisma/schema/applications.prisma` | `ApplicationRevocationEndpoint`, `ApplicationRevocationDelivery` |
| Worker startup | `apps/server/src/index.ts` | `startApplicationRevocationWorker()` |
| URL safety | `assertSafeRevocationDestination()` in revocation service | HTTPS, no private IPs, local opt-in |
| Signing | `auth.api.signJWT()` + `/api/auth/jwks` | Used for revocation (JWT/RS256) |
| Activity log | `activityEvent` table | Delivery success/failure audit |
| Env flags | `packages/env/src/env.server.ts` | `ENABLE_APPLICATION_REVOCATION_DELIVERY`, `ALLOW_LOCAL_APPLICATION_WEBHOOKS` |

---

## 5. Recommended Database Schema Changes

Add to `packages/db/prisma/schema/applications.prisma` (or a new `webhooks.prisma`):

```prisma
model ApplicationWebhookEndpoint {
  id              String      @id @default(cuid())
  applicationId   String      @unique
  application     Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  url             String
  secret          String      // base64url HMAC key
  enabled         Boolean     @default(false)
  subscribedEvents String[]   @default(["user.created", "user.updated", "user.deleted"])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  deliveries      ApplicationWebhookDelivery[]

  @@map("application_webhook_endpoint")
}

model ApplicationWebhookDelivery {
  id             String    @id @default(cuid())
  applicationId  String
  application    Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  endpointId     String?
  endpoint       ApplicationWebhookEndpoint? @relation(fields: [endpointId], references: [id], onDelete: SetNull)
  destinationUrl String
  eventType      String
  eventId        String    // SSO event envelope id
  payload        Json      // full event envelope
  status         String    @default("pending")
  attemptCount   Int       @default(0)
  nextAttemptAt  DateTime  @default(now())
  leaseUntil     DateTime?
  deadlineAt     DateTime
  deliveredAt    DateTime?
  lastHttpStatus Int?
  lastErrorCode  String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([status, nextAttemptAt])
  @@index([applicationId, createdAt])
  @@index([endpointId])
  @@map("application_webhook_delivery")
}
```

### Notes

- One endpoint per application for V1 (mirrors revocation). Multiple endpoints can be added later by removing `@unique` on `applicationId`.
- `subscribedEvents` is an array of event type strings.
- The existing `WebhookEvent` model in `packages/db/prisma/schema/webhook.prisma` is an **inbound audit log for Polar webhooks**. Do not reuse it for outbound user events.

---

## 6. Recommended Webhook Signing Mechanism

Use **HMAC-SHA256 with a per-endpoint secret** instead of the existing RS256/JWKS flow.

### Why HMAC here?

- Industry standard for webhooks (Stripe, GitHub, etc.).
- Receivers verify with a known secret; no JWKS fetch or issuer logic required.
- Simpler package API and smaller payload.

### Delivery request format

```http
POST /your/webhook/path
Content-Type: application/json
X-SSO-Event-ID: <eventId>
X-SSO-Timestamp: <unix-timestamp-seconds>
X-SSO-Signature: t=<timestamp>,v1=<hex-hmac>

{
  "id": "evt_...",
  "type": "user.created",
  "createdAt": "2026-08-18T12:00:00.000Z",
  "data": { ... }
}
```

### Signature construction

1. Compute `timestamp = Math.floor(Date.now() / 1000)`.
2. Build the signed payload string: `${timestamp}.${base64Url(JSON.stringify(envelope))}`.
3. Compute `hmac = HMAC_SHA256(secret, signedPayloadString)`.
4. Header value: `t=<timestamp>,v1=<hex(hmac)>`.

Secret generation: `crypto.randomBytes(32).toString("base64url")`.

### Receiver verification

1. Parse the header; require `t` and `v1`.
2. Reject if `Math.abs(now - t) > maxAgeSeconds` (default 300).
3. Recompute the HMAC using the configured secret.
4. Reject if the signatures do not match.
5. Use `eventId` to deduplicate deliveries.

---

## 7. Recommended Package API

Add to `@skycanvasstudio/sso/server`. The package already depends on `jose` and uses Web `Request`/`Response` everywhere, so a single shared implementation works across frameworks.

```ts
export type WebhookEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted";

export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  createdAt: string;
  data: T;
}

export interface WebhookUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface UserCreatedEvent { data: WebhookUser }
export interface UserUpdatedEvent { data: WebhookUser }
export interface UserDeletedEvent { data: { id: string } }

export interface WebhookHandlers {
  "user.created"?: (event: UserCreatedEvent) => Promise<void> | void;
  "user.updated"?: (event: UserUpdatedEvent) => Promise<void> | void;
  "user.deleted"?: (event: UserDeletedEvent) => Promise<void> | void;
}

export async function verifyWebhookEvent(
  request: Request,
  secret: string,
  options?: { maxAgeSeconds?: number },
): Promise<WebhookEvent>;

export function createWebhookHandler(
  handlers: WebhookHandlers,
  options: { secret: string; maxAgeSeconds?: number },
): (request: Request) => Promise<Response>;
```

### Example receiver

```ts
import { createWebhookHandler } from "@skycanvasstudio/sso/server";

export const POST = createWebhookHandler({
  "user.created": async ({ data }) => {
    await prisma.user.upsert({ where: { id: data.id }, ... });
  },
  "user.updated": async ({ data }) => {
    await prisma.user.upsert({ where: { id: data.id }, ... });
  },
  "user.deleted": async ({ data }) => {
    await prisma.user.delete({ where: { id: data.id } });
  },
}, { secret: process.env.SSO_WEBHOOK_SECRET! });
```

Because it returns a plain Web `Request` handler, it works in Next.js App Router, Elysia, TanStack Start, Hono, etc.

---

## 8. Files to Add or Modify

### Schema / DB

- `packages/db/prisma/schema/applications.prisma` — add `ApplicationWebhookEndpoint` and `ApplicationWebhookDelivery`.
- Run `bun run db:generate` and `bun run db:migrate`.

### Server delivery pipeline

- `apps/server/src/modules/user-webhooks/delivery.service.ts` — enqueue, worker, signing, retry logic.
- `apps/server/src/modules/user-webhooks/user-webhooks.service.ts` — CRUD for endpoints.
- `apps/server/src/modules/user-webhooks/user-webhooks.controller.ts` — admin routes.
- `apps/server/src/index.ts` — start the worker next to `startApplicationRevocationWorker()`.

### Auth hooks

- `packages/auth/src/lib/user-webhook-hooks.server.ts` — new plugin with `databaseHooks.user.create/update/delete`.
- `packages/auth/src/auth-options.server.ts` — add the plugin to `plugins[]`.

### Manual enqueue points

- `apps/server/src/modules/admin/users/users.service.ts` — `updateUser`, `banUser`, `unbanUser`, `archiveUser`, `restoreUser`, `deleteUserPermanent`.
- `apps/server/src/modules/profile/profile.service.ts` — `runProfileAction("update_name")`.

### Package

- `npm_package/src/server/webhooks.ts` — verify/sign/handler helpers.
- `npm_package/src/server/index.ts` — export webhook APIs.
- `npm_package/tests/webhooks.test.ts` — receiver verification tests.

### Env / config

- `packages/env/src/env.server.ts` — add `ENABLE_USER_WEBHOOK_DELIVERY`, `ALLOW_LOCAL_USER_WEBHOOKS`.

---

## 9. Architectural Problems and Edge Cases

1. **No single user service.** User mutations are split between Better Auth hooks and direct `prisma.user.*` calls. Webhook emission must be wired in two places.
2. **Better Auth hooks run inside the auth transaction.** Emitting `fetch()` from a hook would block signup and could fail user creation. Hooks must only write delivery rows.
3. **Admin `deleteUserPermanent` bypasses Better Auth.** It calls `prisma.user.delete` directly, so `databaseHooks.user.delete.before` will not fire there. Capture the user explicitly before deletion.
4. **Application context is not always available in hooks.** For platform sign-ups, there is no application. For embedded SDK sign-ups, the `clientId`/application context must be threaded into the hook via AsyncLocalStorage or transaction metadata.
5. **Platform-only users must be ignored.** An owner or admin created with no `ApplicationMember` should not generate `user.created` webhooks.
6. **`user.updated` noise.** Better Auth may update fields you do not care about. Compare against a whitelist of webhook-visible fields (`name`, `email`, `emailVerified`, `image`, `banned`, `archived`) and skip if none changed.
7. **Role changes are platform RBAC, not user profile.** The webhook user payload should include only identity fields, not `rbacRoles`. Admin role changes should not emit `user.updated` unless the payload is intentionally extended later.
8. **OAuth profile sync updates `name`/`image`.** With `overrideUserInfoOnSignIn: true`, every login may update the user. The `user.updated` hook will fire; receivers must be idempotent.
9. **Existing `WebhookEvent` model is inbound-only.** It logs Polar webhooks. Do not reuse it for outbound delivery.
10. **Payload safety.** Never serialize the full `User` DB model. Explicitly build a `WebhookUser` object that excludes password hashes, OAuth tokens, session secrets, Polar IDs, platform roles, etc.

---

## 10. Implementation Order

1. **Schema** — create `ApplicationWebhookEndpoint` / `ApplicationWebhookDelivery` and migrate.
2. **Types** — define `WebhookEvent`, `WebhookUser`, and event payloads in a shared server package.
3. **Delivery service** — implement enqueue, worker, HMAC signer, retry/deadline logic, and destination safety validation.
4. **Auth hooks plugin** — add `user.create.after`, `user.update.after` (with change filtering), `user.delete.before`.
5. **Manual enqueue calls** — wire admin user service and profile service.
6. **Admin controller** — CRUD endpoints for webhook URL/secret/subscriptions and delivery status.
7. **npm_package receiver API** — `verifyWebhookEvent`, `createWebhookHandler`, types.
8. **Env + startup** — add feature flags and start the worker in `apps/server/src/index.ts`.
9. **Tests + docs** — unit tests for signing/verification, integration test for delivery/retry, and a consumer contract doc.

---

*Do not implement until this plan is approved. The next step is to confirm the signing mechanism (HMAC vs. RS256), whether to support multiple endpoints per application in V1, and how to thread application context into the Better Auth hooks for embedded sign-ups.*
