# SSO Product Plan

## Direction

SSO will become the central identity and access platform for company
applications. The old production SSO is only a read-only behavioral reference;
it is not a migration source and does not impose a compatibility rollout.

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

4. **Direct application integration**
   - Add protocol features only when a new application contract requires them.
   - Avoid copying legacy security weaknesses such as long-lived generic JWTs, prefix redirect matching, public secret exposure, and userId-based biometric login.

## Near-Term Scope

The secure authorization-code foundation is implemented behind a deployment
flag: exact callbacks and origins, PKCE code exchange, pairwise subjects,
short-lived RS256 access and ID tokens, JWKS, and sanitized exchange auditing.

Next, verify the disabled-by-default flow in staging, then integrate applications
directly with the new SSO. Google authentication is a separate post-staging
slice; Facebook and Apple follow in independently reviewed slices. Their provider
callbacks will terminate on the API origin and return to the web authorization
UI through a signed continuation.
