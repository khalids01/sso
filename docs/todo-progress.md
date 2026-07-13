# SSO Todo And Progress

## Progress Tracking Rule

Always update this file when meaningful SSO work is completed or when the recommended next step changes. This file is the handoff source for future chats.

## Current Next Step

Next, choose the first browser authentication protocol shape and plan the authorization-code flow with PKCE. Application access decisions are now modeled, but token issuance should still wait until the flow shape is explicit.

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
- [ ] Add client secret generation, rotation, and safe display behavior.
- [ ] Add application branding fields for login and email flows.

## Application Access

- [x] Design user-to-application access/membership model.
- [ ] Add app-specific roles, scopes, or claims.
- [x] Add admin controls for granting, suspending, and revoking app access.
- [x] Add audit events for app access changes.

## Auth And Token Flow

- [ ] Choose the first supported protocol shape for browser apps.
- [ ] Implement authorization-code flow with PKCE.
- [ ] Issue app-scoped access tokens with audience and expiry.
- [ ] Add userinfo or profile endpoint for client apps.
- [ ] Add token revocation/introspection/JWKS support as needed.

## Migration

- [ ] Inventory old production clients and required flows.
- [ ] Map old users and client IDs into the new identity/application model.
- [ ] Define compatibility endpoints only where existing apps need them.
- [ ] Build a staged migration plan with rollback points.

## Tests And Rollout

- [x] Add tests for application/client validation.
- [x] Add tests for app membership access decisions.
- [ ] Add tests for token issuance and revocation.
- [ ] Add migration smoke tests using old production flow examples.
- [ ] Add observability for failed login, invalid redirect, token exchange, and revocation events.
