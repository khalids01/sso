# SSO Architecture

## Current Architecture

SSO is a Bun/Turborepo TypeScript monorepo.

- `apps/web`: TanStack Start frontend for public pages, protected user pages, onboarding, and admin.
- `apps/server`: Elysia API server for auth helpers, session context, admin modules, rate limits, visitors, notifications, feedback, Polar, and invitations.
- `packages/auth`: Better Auth configuration, custom session payload, magic-link auth, Polar integration, and session types.
- `packages/db`: Prisma schema, generated client, RBAC data access, session revocation, and seed helpers.
- `packages/rbac`: permission catalog, role definitions, role-permission defaults, and permission checks.
- `packages/redis`: shared Redis connection used by RBAC/session caches and rate limits.
- `packages/config`, `packages/env`, `packages/email`: shared product config, environment validation, and email transport/templates.

## Platform Authentication And RBAC

The current `User` model represents platform identities. Better Auth owns sessions and accounts. A custom session plugin attaches computed RBAC data to the session payload.

Platform RBAC controls SSO admin access:

- `platform.owner` is protected and used for bootstrap/control.
- `platform.admin` can use admin features based on permissions.
- `platform.user` is the default low-privilege role.
- Admin routes require `admin.access` and module-specific permissions.

This RBAC layer is for the SSO control plane. It should not be reused directly as client-application authorization.

## Target SSO Provider Model

Future SSO provider work should introduce separate domain objects:

- **Application**: a company app or service that relies on SSO.
- **Application client**: OAuth/OIDC-style client credentials, redirect URIs, allowed origins, and status.
- **Application membership/access**: a user-to-application relationship with status and optional app roles/scopes.
- **Application roles/claims**: app-scoped permissions emitted into app tokens or returned by userinfo.
- **Issued authorization/session records**: short-lived authorization codes, refresh/token state, revocation metadata, and audit context.

The same identity can be:

- a platform admin for SSO,
- an end user of one app,
- a support user of another app,
- or only a stored identity with no app access.

## Intended Auth Flow

1. Client app redirects to SSO with client identity, exact redirect URI, state, and PKCE data.
2. SSO validates the client and redirect URI.
3. User signs in or reuses an existing SSO session.
4. SSO checks application membership/access.
5. SSO returns an authorization code to the validated redirect URI.
6. Client exchanges the code for app-scoped tokens.
7. Tokens include app audience, subject, expiry, and app-specific claims.
8. Admins can revoke app sessions/access from the SSO control plane.

## Legacy Migration Notes

The old production SSO proves the required integrations: client token validation, login/register, social auth, password reset, and client-branded flows. Its behavior should guide migration, but the new implementation should avoid:

- one-year generic bearer JWTs,
- redirect URI prefix matching,
- exposing provider secrets through client-info endpoints,
- public CORS everywhere,
- hardcoded or disabled admin auth,
- biometric login based only on a submitted user ID.
