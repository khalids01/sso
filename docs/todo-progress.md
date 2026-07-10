# SSO Todo And Progress

## Documentation And Branding

- [x] Create `docs/plan.md`.
- [x] Create `docs/architecture.md`.
- [x] Create `docs/todo-progress.md`.
- [x] Update README from template documentation to SSO product documentation.
- [x] Apply product name, logo text, slug, Redis prefix, and description.

## Client Application Model

- [ ] Design `Application` and `ApplicationClient` data models.
- [ ] Add admin UI for application/client management.
- [ ] Add exact redirect URI and origin validation.
- [ ] Add client secret generation, rotation, and safe display behavior.
- [ ] Add application branding fields for login and email flows.

## Application Access

- [ ] Design user-to-application access/membership model.
- [ ] Add app-specific roles, scopes, or claims.
- [ ] Add admin controls for granting, suspending, and revoking app access.
- [ ] Add audit events for app access changes.

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

- [ ] Add tests for application/client validation.
- [ ] Add tests for app membership access decisions.
- [ ] Add tests for token issuance and revocation.
- [ ] Add migration smoke tests using old production flow examples.
- [ ] Add observability for failed login, invalid redirect, token exchange, and revocation events.
