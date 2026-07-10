# SSO Product Plan

## Direction

SSO will replace the old production SSO as the central identity and access platform for company applications. The new app is the foundation; the old production app is the migration source and compatibility reference.

The core product rule is separation of concerns:

- **Identity**: a person/account known to SSO.
- **Platform access**: permission to use the SSO admin/control plane.
- **Application access**: permission to sign in to a specific client app or service.

This means a user can exist in SSO, authenticate for a client app, and still have no access to the SSO admin dashboard.

## Current Foundation

The current app already provides:

- Better Auth platform sessions.
- PostgreSQL-backed users, sessions, accounts, invitations, activity, visitors, feedback, notifications, webhooks, and rate-limit settings.
- Platform RBAC with roles, permissions, user role assignment, permission cache, and admin guards.
- Owner bootstrap and protected owner policies.
- Admin user management, invitations, role management, session revocation, ban/archive, and activity logs.
- Redis-backed RBAC/session caching and rate limiting.
- TanStack web app with protected and admin layouts.

## Target Capabilities

Add SSO-provider capabilities in layers:

1. **Application registry**
   - Register internal and customer-facing applications.
   - Store allowed redirect URIs, allowed origins, branding, status, and client credentials.

2. **Application access**
   - Assign identity users to applications.
   - Support app-specific roles, scopes, claims, and access status.
   - Keep platform RBAC separate from app authorization.

3. **SSO flows**
   - Add secure authorization flow for browser apps.
   - Issue app-scoped tokens with the correct audience and claims.
   - Add userinfo, token validation/introspection, revocation, and JWKS support where needed.

4. **Migration and compatibility**
   - Preserve enough old production behavior for existing apps to migrate safely.
   - Avoid copying legacy security weaknesses such as long-lived generic JWTs, prefix redirect matching, public secret exposure, and userId-based biometric login.

## Near-Term Scope

This documentation/branding step does not implement the application/client model. It only records the target direction and prepares the current app to become the SSO product.
