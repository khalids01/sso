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

## First Browser Protocol

The first browser protocol is an OIDC-shaped OAuth authorization-code flow for
trusted public clients. The initial supported request requires `response_type=code`,
`scope=openid`, client state, and PKCE using `S256`. Optional prompts, extra
scopes, refresh tokens, client credentials, and client secrets are not supported.

Better Auth's OAuth Provider `1.6.23` owns authorization request signing,
exact redirect matching, continuation, and short-lived authorization-code
storage. Its OAuth client model is mapped onto `ApplicationClient`, so the admin
application registry remains authoritative. SSO adds a server-side continuation
guard that requires the user, application, client, and application membership to
all be active before a code is returned.

SSO owns `POST /api/auth/oauth2/token`. It accepts only form-encoded public-client
authorization-code exchanges with `openid` and PKCE `S256`. The code is deleted
atomically before its client, redirect, session, user, application, membership,
origin, and PKCE bindings are revalidated. Failed exchanges return sanitized
OAuth errors and cannot reuse a consumed code. Better Auth's built-in token and
generic session-JWT endpoints remain disabled.

Tokens use stable configured issuer metadata, pairwise application subjects, and
ten-minute RS256 signatures. Access tokens are application-audienced and carry
the membership's monotonic `authorization_version`; ID tokens
are client-audienced and preserve the authorization nonce. Public keys are
published at `/api/auth/jwks` with stable key IDs and cache headers. Private keys
are encrypted at rest, rotate every 30 days, and remain publicly verifiable for a
24-hour retirement grace period. Issuance is deployment-gated and defaults off.

The API owns authorization, exchange, signing keys, JWKS, and future social
provider callbacks. The web app owns login and authorization UI. Client callbacks
receive only `code` and `state`; tokens do not pass through browser URLs or the
web frontend. Userinfo, introspection, revocation, logout, discovery,
registration, and provider client-management endpoints remain deferred.

Applications verify tokens locally and do not call SSO during normal requests.
Each application can configure one revocation webhook. Membership suspension or
revocation and platform user ban/archive create an application-specific durable
outbox event in the same database transaction as the state change, version bump,
and audit event. Global user changes fan out with a different pairwise subject
for every application. Application disable/archive emits an application-wide
event. Restoration increments the version again, so previously issued tokens
cannot become current.

The delivery worker signs each event as a short-lived RS256 JWT using the same
JWKS. Events are application-audienced, idempotent by stable `jti`, and contain
only the pairwise subject and application/membership revocation context. Workers
claim rows with database leases and `FOR UPDATE SKIP LOCKED`, reject redirects
and unsafe destinations, retry transient failures for 24 hours, and dead-letter
terminal failures. Delivery is deployment-gated and defaults off. See
`docs/application-revocation-webhooks.md` for the receiver contract.

Better Auth and its OAuth Provider are exactly version-matched at stable
`1.6.23`. The SSO-owned signed-query, membership, token, audience, and endpoint
guards remain in place instead of broadening the protocol to upstream defaults.
The stable line's resource-indicator advisory is not reachable through the
disabled Better Auth token/refresh paths; the SSO endpoint rejects `resource`
and derives audiences from the code-bound application and client. See
`docs/better-auth-1.6.23-audit.md` for the compatibility, schema, and dependency
review.

Issuance and revocation delivery remain disabled until an explicitly allowlisted
staging deployment passes both role journeys. Authenticated introspection remains
deferred until a real sensitive-client contract requires it. Production client
inventory and pilot selection come next; social-provider migration remains a
separate slice.

## Legacy Migration Notes

The old production SSO proves the required integrations: client token validation, login/register, social auth, password reset, and client-branded flows. Its behavior should guide migration, but the new implementation should avoid:

- one-year generic bearer JWTs,
- redirect URI prefix matching,
- exposing provider secrets through client-info endpoints,
- public CORS everywhere,
- hardcoded or disabled admin auth,
- biometric login based only on a submitted user ID.
