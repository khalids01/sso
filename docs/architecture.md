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

OAuth requests use dedicated `/application/login` and `/application/signup`
pages. They share the platform's underlying accounts and sessions but do not
show platform navigation, and they preserve Better Auth's signed authorization
query through login, signup, and magic-link verification. Platform `/login` and
`/signup` remain the control-plane account experience.

Authentication presentation and registration policy are application-scoped.
Each application independently selects its sign-in methods, signup methods, and
registration mode (`closed`, `invite_only`, or `open`). Signup methods must also
be valid sign-in methods. Open registration creates an active application
membership during the signed OAuth continuation; invitation-only registration
requires a pending, unexpired invitation for the authenticated email. Password
signup uses a guarded SSO endpoint, and each application decides whether an
email must be verified before authorization and token issuance. Existing shared
SSO sessions remain reusable across applications;
the method selection controls the unauthenticated application experience, not a
token authentication-method assurance claim.

Server-side clients resolve their application binding from
`GET /api/oauth/client-metadata?client_id=...`. The public response contains only
the client ID, application ID, derived application audience, configured SSO
issuer, and public application authentication policy. This removes duplicate
application-ID and issuer settings while retaining exact token and
revocation-event verification.

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

Targeted dependency maintenance keeps network-facing runtime packages on patched
compatible releases. The remaining audit report is limited to reviewed local
CLI/build paths, unused optional peers, and the separately mitigated stable
OAuth Provider advisory. See `docs/dependency-security-review.md`. TanStack
Start's client/server import protection remains enabled; isomorphic public
browser configuration is isolated in `packages/env/src/env.public.ts`.

Issuance and revocation delivery remain disabled by default and require
deliberate deployment configuration. Local automated and browser verification is
the current acceptance gate; staging verification is deferred. Client
integration can proceed directly using the locally verified public-client
contract. Authenticated introspection remains deferred until a real sensitive
client requires it. Google, Facebook, LinkedIn, and GitHub use optional
server-side Better Auth provider registrations. A provider is exposed to an
application only when both credentials are configured and the application has
enabled it. Instagram and Apple remain deferred.

## Old SSO Behavioral Reference

The old production SSO demonstrates client token validation, login/register,
social auth, password reset, and client-branded behavior. It is not a migration
source or staging target. Do not access or mutate it during new SSO development,
and do not add compatibility behavior unless a new application contract
independently requires it. The new implementation avoids:

- one-year generic bearer JWTs,
- redirect URI prefix matching,
- exposing provider secrets through client-info endpoints,
- public CORS everywhere,
- hardcoded or disabled admin auth,
- biometric login based only on a submitted user ID.

Protected web routes load Polar customer state only for billing-eligible
`platform.user` identities. Admins and owners intentionally do not require Polar
customers. A Polar resource-not-found response maps to no subscription, while
other Polar failures propagate. The built local E2E API explicitly disables
Polar, and the web server recognizes only aborted closed-connection SSR errors
as expected browser cancellation.

Failed password and magic-link logins and rejected OAuth authorization requests
are recorded as warning activity events with response request IDs. Their metadata
is intentionally limited to a normalized reason, status, login method, and a
validated OAuth client ID. Request bodies, email addresses, credentials, redirect
URIs, state, authorization codes, tokens, and signed continuation data are never
copied into these events.
