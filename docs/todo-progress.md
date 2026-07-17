# SSO Todo And Progress

## Progress Tracking Rule

Always update this file when meaningful SSO work is completed or when the recommended next step changes. This file is the handoff source for future chats.

## Current Next Step

Integrate the first application directly with the new SSO and capture only the
profile, role, scope, and branding requirements that application actually needs.
Local automated and browser validation is the current acceptance gate; staging
verification is deferred. Do not access or mutate the old production SSO. It is
only a behavioral reference, and no pilot or compatibility migration is
required. Authenticated introspection remains deferred until a real sensitive
client requires it. Google authentication is a separate later slice; Facebook
and Apple remain deferred.

## Guardrails

- Owner creation must stay CLI-only through `bun make-owner`.
- Do not reintroduce `/setup`, `/owner/setup`, `OWNER_SETUP_CHECK`, or `VITE_OWNER_SETUP_CHECK`.
- Keep platform RBAC separate from application access.
- Keep `platform.owner` protections and the make-owner script.
- Redis key prefix remains `sso:`.

## Documentation And Branding

- [x] Create `docs/plan.md`.
- [x] Create `docs/architecture.md`.
- [x] Create `docs/todo-progress.md`.
- [x] Update README from template documentation to SSO product documentation.
- [x] Apply product name, logo text, slug, Redis prefix, and description.
- [x] Remove stale architecture doc mention of setup routes.

## Client Application Model

- [x] Design `Application` and `ApplicationClient` data models.
- [x] Add Prisma schema and migration for applications and application clients.
- [x] Add minimal admin API for listing/creating applications and clients.
- [x] Add `admin.applications.read` and `admin.applications.manage` permissions.
- [x] Add admin UI for application/client management.
- [x] Add application/client lifecycle management UI and API for edit, archive, restore, and permanent delete.
- [x] Add exact redirect URI and origin validation.
- [x] Improve client redirect URI and allowed origin inputs with repeatable single-line rows and row-level validation.
- [x] Split the applications management page into small local components and entity-specific CRUD modules.
- [x] Replace nested application accordions with a flat registry and dedicated
  client/member management pages with direct, refresh-safe URLs.
- [ ] Add client secret generation, rotation, and safe display behavior.
- [ ] Add application branding fields for login and email flows.

## Application Access

- [x] Design user-to-application access/membership model.
- [ ] Add app-specific roles, scopes, or claims.
- [x] Add admin controls for granting, suspending, and revoking app access.
- [x] Add audit events for app access changes.
- [x] Add monotonic membership authorization versions to tokens and lifecycle changes.
- [x] Add application-specific signed revocation events and durable delivery outbox.
- [x] Add guarded webhook configuration, delivery status, retry, and dead-letter UI/API.

## Auth And Token Flow

- [x] Choose an OIDC-shaped authorization-code flow for trusted public browser clients.
- [x] Add Better Auth OAuth Provider authorization and signed continuation foundation.
- [x] Upgrade matched Better Auth packages to stable `1.6.23` without replacing the SSO-owned token endpoint.
- [x] Require `openid`, state, and PKCE `S256`; reject optional prompts and scopes.
- [x] Preserve authorization requests through magic-link login and enforce active application membership before returning a code.
- [x] Keep Better Auth's built-in token and generic session-JWT endpoints disabled.
- [x] Implement authorization-code exchange with atomic code consumption and PKCE `S256`.
- [x] Issue pairwise, app-scoped RS256 access and ID tokens with ten-minute expiry.
- [x] Publish rotating public signing keys through a cacheable JWKS endpoint.
- [ ] Add userinfo or profile endpoint for client apps.
- [x] Add pushed application-local session revocation without per-request SSO calls.
- [ ] Add authenticated introspection only when a sensitive client contract requires it.

## Application Integration

- [x] Document the old production behavior as a read-only reference.
- [x] Remove pilot and compatibility migration requirements from the rollout plan.
- [ ] Integrate the first application directly using the locally verified contract.
- [ ] Capture app-specific profile, role, scope, and revocation requirements before
  extending the initial protocol.

## Tests And Rollout

- [x] Add tests for application/client validation.
- [x] Add tests for app membership access decisions.
- [x] Add unit, integration, concurrency, CORS, disabled-flag, JWT/JWKS, and browser tests for token issuance.
- [x] Add unit, integration, concurrency, SSRF, retry, JWT/JWKS, and browser revocation tests.
- [ ] Add contract tests when a directly integrated application requires behavior
  beyond the initial protocol.
- [x] Add sanitized observability for application revocation delivery outcomes.
- [x] Complete observability review for failed login and invalid redirects.
- [x] Add guarded permission-driven Playwright infrastructure for local and staging.
- [x] Add visible password-login coverage and the Applications admin lifecycle journey.
- [x] Complete real local Playwright runs with dedicated allowlisted admin and user identities.

## Latest Verification

- Server tests: `205 pass`, `0 fail` across 49 files.
- OAuth Provider runtime initialization succeeded.
- Better Auth's built-in token endpoint and generic session-JWT endpoint return
  `404`; the SSO token endpoint also returns `404` while its deployment flag is off.
- Forged signed continuation data returns `invalid_signature` before access lookup.
- `bun run check-types` and the web production build pass.
- `git diff --check` passes.
- Password login remains environment-gated with password signup disabled.
- Playwright discovers setup, cleanup, permission, application lifecycle, and sign-out tests.
- E2E helper tests pass (`8 pass`, `0 fail`), Chromium launches successfully,
  and the web client/SSR production build passes.
- Web and email now resolve a single React `19.2.5` runtime, fixing the admin
  applications page hook-context crash introduced by the dependency refresh.
- Application detail, clients, and members routes build for client and SSR;
  unauthenticated direct-route smoke tests correctly redirect to `/login`.
- Local `platform.admin` E2E verification passes: `7 passed`, `0 failed`,
  including the real callback, exchange, JWT/JWKS validation, replay rejection,
  webhook configuration, signed pairwise delivery, and idempotent invalidation.
- Local `platform.user` E2E verification passes: `6 passed`, `1 skipped`,
  `0 failed`. Visible password login and the real `platform.user` session pass;
  admin navigation is absent, the direct admin route redirects to `/dashboard`,
  and the authenticated applications API returns `403`. The application
  lifecycle is explicitly skipped as not applicable, while the same OAuth/JWKS
  journey succeeds independently of platform RBAC. Sign-out, protected-route
  redirects, run-owned cleanup, and actor-lock release pass.
- Prisma reports all 19 migrations applied to the local loopback PostgreSQL
  database; the schema is up to date.
- Local built E2E starts the API with `ENABLE_POLAR=false` explicitly. Protected
  routes skip Polar state for admins and owners, missing Polar customers resolve
  to no subscription, and unrelated Polar failures remain visible.
- Base UI auth links use the supported `render` API while preserving anchor
  semantics and button styling.
- Login/logout navigation no longer reports expected browser-cancelled streamed
  SSR as an unhandled 500. Handling requires an aborted request and the exact
  closed-connection `AbortError`; focused tests preserve unrelated failures.
- Failed password and magic-link logins and rejected OAuth authorization requests
  create warning activity events with a response request ID. Events never store
  credentials, email addresses, redirect URIs, state, codes, tokens, or signed
  continuation data; unsafe provider error text is replaced with a fixed reason.
- Full TypeScript checks, Prisma validation/generation, server and web client/SSR
  builds, E2E helper tests, and the final diff whitespace check pass.
- Better Auth `1.6.23` schema generation was compared outside the repository.
  Enabled behavior requires no new fields, so no migration or unused OAuth token
  tables were added.
- A real 1.6.23 browser-issued authorization code is consumed by the SSO-owned
  exchange in both roles. Client-controlled resource indicators are rejected at
  authorization and token endpoints.
- JWKS consumer coverage verifies immediate refresh for an unknown `kid`; the
  existing issuance coverage verifies signatures, claims, replay rejection,
  pairwise-subject stability, retired-key publication policy, and no refresh or
  platform claims.
- Application revocation coverage verifies transactional version/outbox changes,
  global-ban fan-out with isolated pairwise subjects, application-wide events,
  concurrent lease claiming, retries, terminal failures, deadline expiry, and
  restoration without reviving old tokens.
- The production web build preserves Better Auth's repeated signed continuation
  parameters and completes post-login only from the exact configured web origin.
- `bun audit` was run and is not clean. The stable 1.6.x OAuth Provider advisory
  is mitigated by disabled upstream token/refresh endpoints, fixed code-bound
  audiences, and explicit `resource` rejection. Other pre-existing findings are
  recorded for a separate dependency-remediation slice.

## Version Risk

- `better-auth` and `@better-auth/oauth-provider` are exactly pinned to matching
  stable `1.6.23` releases; `@better-auth/sso` and 1.7 prereleases are absent.
- Stable 1.6.x is affected by `GHSA-p2fr-6hmx-4528`. The affected Better Auth
  token behavior is disabled and regression-tested at our boundary. Upgrade to
  the first patched stable release when available.
- Local verification is the current acceptance gate and staging is deferred.
  Production issuance and revocation delivery remain disabled by default and
  require deliberate deployment configuration; the old production SSO remains
  untouched.
