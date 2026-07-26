# SkyCanvas SSO integration instructions for coding agents

Use this document when adding SkyCanvas SSO to an existing TypeScript application. Treat the target project's current structure, authentication library, database, session model, naming, and package manager as authoritative.

## Objective

Add SkyCanvas as an OAuth 2.0/OpenID Connect identity provider with the smallest safe change to the target application.

Do not introduce a second user table, session system, auth library, callback implementation, or profile endpoint when the project already has equivalents.

## Before changing code

1. Read the target project's agent instructions and package scripts.
2. Inspect `package.json`, environment schemas, route structure, auth configuration, auth client, database adapter, session usage, sign-in UI, and protected server code.
3. Determine the architecture:
   - Fullstack Next.js
   - Fullstack TanStack Start
   - React frontend with a separate Node.js backend
   - React frontend with a separate Elysia backend
   - Browser client with a separate Node.js or Elysia backend
4. Determine the auth mode:
   - Existing Better Auth
   - No auth library
5. Find the public application origin for local, preview, and production environments.
6. Confirm the SkyCanvas client ID and registered callback URL. If they are unavailable, stop and ask for them. Never invent credentials or callback URLs.
7. Preserve the project's package manager and file conventions. Do not move unrelated auth code.

## SkyCanvas provider contract

Base URL:

```text
SSO_URL=https://api-sso.skycanvasstudio.com
```

Provider endpoints:

```text
Authorization: {SSO_URL}/api/auth/oauth2/authorize
Token:         {SSO_URL}/api/auth/oauth2/token
JWKS:          {SSO_URL}/api/auth/jwks
Metadata:      {SSO_URL}/api/oauth/client-metadata?client_id={SSO_CLIENT_ID}
```

The flow uses Authorization Code with PKCE. Request the `openid` scope. The browser may know the client ID, but OAuth tokens and application-session secrets must remain server-side.

Expected ID-token claims:

```text
sub
name
email
email_verified
picture (optional)
nonce
```

Validate signature, issuer, audience, expiry, and nonce before trusting an ID token when the chosen auth library does not already perform those checks.

## Choose exactly one implementation path

### Path A: Existing Better Auth

Use Better Auth's Generic OAuth server plugin and client plugin. Better Auth must continue to own:

- OAuth state and PKCE
- The OAuth callback
- Local users and linked accounts
- Application sessions and cookies
- Session reads and logout

Do not add custom `/auth/login`, `/auth/callback`, `/auth/profile`, or `/auth/logout` routes alongside Better Auth.

Add the provider to the existing Better Auth configuration. Merge it into the existing `plugins` array; do not create a second Better Auth instance.

Use these provider values:

```text
providerId: skycanvas
clientId: SSO_CLIENT_ID
authorizationUrl: {SSO_URL}/api/auth/oauth2/authorize
tokenUrl: {SSO_URL}/api/auth/oauth2/token
scopes: openid
pkce: true
```

Use the Generic OAuth client plugin and start login with Better Auth's `signIn.oauth2` using `providerId: "skycanvas"`. Keep using the project's existing `useSession`, `auth.api.getSession`, and `signOut` calls.

If the project already has a user with the same email, preserve its account-linking policy. Do not add `skycanvas` to `trustedProviders` unless the owner explicitly wants forced linking. A verified provider email is required for safe implicit linking.

Enable encrypted OAuth-token storage when compatible with the existing Better Auth configuration.

#### Next.js with Better Auth

Follow the target project's `src` convention if it has one. Preferred files:

```text
.env.local
src/lib/auth.ts
src/lib/auth-client.ts
src/app/api/auth/[...all]/route.ts
src/app/sign-in/sso-button.tsx
```

The callback registered in SkyCanvas must be exact:

```text
http://localhost:3000/api/auth/oauth2/callback/skycanvas
https://your-domain.example/api/auth/oauth2/callback/skycanvas
```

Better Auth derives this URI from:

```text
{BETTER_AUTH_URL}/api/auth/oauth2/callback/{providerId}
```

With `providerId: "skycanvas"`, the final path must end in `/api/auth/oauth2/callback/skycanvas`. The shorter `/api/auth/callback` path is not the Better Auth Generic OAuth callback.

Do not add or depend on `SSO_CALLBACK_URL` for this path. Better Auth generates the callback and handles it through `src/app/api/auth/[...all]/route.ts`. Before changing dashboard settings, inspect the outgoing authorization request and copy its decoded `redirect_uri` value exactly. Scheme, host, port, path, and trailing slash must all match the registered URI.

The catch-all route exports Better Auth's Next.js `GET` and `POST` handlers. Do not create individual Next.js login or callback route files for this path.

Read sessions in Server Components and server actions through the existing Better Auth server instance. Client Components may use the existing Better Auth React client.

#### TanStack Start with Better Auth

Keep the Better Auth server instance in the project's existing server/lib location and mount its handler using the project's current TanStack Start server-route convention. Keep browser helpers in the existing client/lib location.

Determine the actual Better Auth base path from the project before registering the callback. Do not assume a Next.js filesystem route in TanStack Start.

### Path B: No auth library

Only use this path when the target project has no auth library and the owner chose the manual integration.

The server must own:

- PKCE verifier and challenge
- State and nonce
- Authorization redirect
- Code exchange
- JWT verification through JWKS
- Encrypted HttpOnly application-session cookie
- Profile/session endpoint
- Logout endpoint

The frontend must only:

- Navigate to the backend login endpoint
- Request the current application session/profile with credentials
- POST to the backend logout endpoint

Never store access tokens or ID tokens in local storage, session storage, React state, or browser-readable cookies.

#### Next.js without an auth library

Put reusable crypto, token, cookie, and session helpers under `src/lib`. Put HTTP handlers under App Router routes:

```text
src/lib/sso-server.ts
src/lib/sso-types.ts
src/app/api/auth/login/route.ts
src/app/api/auth/callback/route.ts
src/app/api/auth/profile/route.ts
src/app/api/auth/logout/route.ts
```

Register the exact callback:

```text
http://localhost:3000/api/auth/callback
https://your-domain.example/api/auth/callback
```

#### Separate React or browser frontend

Do not implement OAuth in the frontend. Add a small client helper in the frontend's existing `lib` or `auth` directory that calls the backend's login, profile, and logout routes.

If frontend and backend origins differ:

- Use `credentials: "include"` for profile and logout requests.
- Configure one explicit allowed frontend origin on the backend.
- Do not combine wildcard CORS with credentials.
- Use cookie attributes appropriate for the actual deployment topology.
- Protect state-changing requests against cross-site request forgery.

#### Node.js backend

Place reusable SSO logic under the backend's existing `src/lib` or `src/auth` convention. Mount four thin HTTP routes using the project's current router:

```text
GET  /auth/login
GET  /auth/callback
GET  /auth/profile
POST /auth/logout
```

Do not replace the application's server framework or router.

#### Elysia backend

Create one Elysia plugin containing the four auth routes and session derivation, then register it once in the existing server. Keep reusable crypto and type helpers outside route components when the project already follows that convention.

## Environment variables

Use the project's existing environment validation system. Do not bypass it with scattered non-null assertions when a validated environment module exists.

Typical server-only variables:

```text
SSO_URL
SSO_CLIENT_ID
APP_URL
SESSION_SECRET        # manual integration only
BETTER_AUTH_URL       # Better Auth projects
BETTER_AUTH_SECRET    # Better Auth projects
```

Do not prefix server-only values with `NEXT_PUBLIC_` or expose them through a client environment bundle.

Use separate SkyCanvas applications or client IDs for local, preview, and production when their callback URLs differ.

## Required flow

### Better Auth flow

```text
Sign-in button
→ Better Auth signIn.oauth2
→ SkyCanvas authorization endpoint
→ Better Auth callback
→ Better Auth token exchange and user/account handling
→ Better Auth application session
→ requested callbackURL
```

### Manual flow

```text
Sign-in link
→ local backend login route
→ PKCE/state/nonce cookie and SkyCanvas redirect
→ local callback route
→ code exchange and token verification
→ encrypted application-session cookie
→ requested local return path
```

Only accept relative, allowlisted return paths. Never redirect to an arbitrary URL supplied by a query parameter.

## Verification checklist

Before finishing:

1. Run the target project's formatter if it has one.
2. Run type checking and the production build.
3. Run relevant auth tests.
4. Confirm the generated authorization request contains the correct client ID, callback URL, `openid` scope, state, nonce, and PKCE challenge.
5. Test a new SkyCanvas user.
6. Test a returning linked user.
7. Test an existing local user with the same verified email according to the project's linking policy.
8. Confirm protected server code reads the local application session, not a browser token.
9. Confirm logout clears the local application session.
10. Confirm invalid state, nonce, code, issuer, audience, and expired tokens fail closed.
11. Confirm no secrets or OAuth tokens appear in client bundles, browser storage, URLs, or logs.
12. Confirm the production callback registered in SkyCanvas exactly matches the callback sent during authorization and token exchange.

## Completion rules

- Make the minimum changes required for the selected architecture.
- Reuse existing auth, database, session, UI, routing, error handling, and environment patterns.
- Do not leave two competing examples or duplicate files in the project.
- Do not add speculative abstractions or an npm package.
- Do not change unrelated sign-in methods.
- Do not claim completion until type checking or the production build succeeds.
- Report the files changed, the registered callback URL, the chosen path, and any manual dashboard or environment action still required.
