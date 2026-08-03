# SkyCanvas SSO implementation guide for coding agents

Use this document when adding SkyCanvas SSO to an application. The official package is `@skycanvasstudio/sso`. Its auth core is headless; React applications may use the optional shadcn-style controls from `/react` and the packaged stylesheet.

## First inspect the target project

Before editing:

1. Read its package manifest, environment schema, auth configuration, server entry point/routes, browser auth client, and tests.
2. Determine whether it uses Better Auth, another OAuth/OIDC library, no auth library, or a non-JavaScript backend.
3. Preserve the existing user, account-linking, session, cookie, database, route, and error-handling design.
4. Find the public server origin and the exact callback URI used in every environment.
5. Choose exactly one path below. Do not create a second auth or session system.

Framework-specific code should be only the thin route adapter required to forward a standard Web `Request`. Do not change the OAuth flow based on Next.js, TanStack Start, Express, Elysia, or another framework.

## Callback URL decision

Choose the callback by the component that owns the local session:

| Session owner | Exact callback pattern |
| --- | --- |
| Better Auth with `createSsoBetterAuthProvider` | `${BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas` |
| Package server with `createSsoServer` | `${APP_URL}/auth/callback` |
| Another OAuth/OIDC library | That library's generated callback URL |

Never infer the integration from an environment-variable name. An application
using `createSsoServer` may call its origin `BETTER_AUTH_URL`, but its callback is
still `/auth/callback`. Never register the Better Auth callback for the package
server path. When using `createSsoServer`, report `sso.callbackUrl` as the exact
dashboard value.

## Path A: Existing Better Auth

Prerequisite: Better Auth must already work independently with its database,
generated schema, server handler, and browser client. SkyCanvas SSO does not
create or manage Better Auth's users, sessions, accounts, verification records,
or database schema. If that setup is incomplete, stop and follow the official
[Better Auth installation](https://www.better-auth.com/docs/installation),
[database](https://www.better-auth.com/docs/concepts/database), and relevant
[framework integration](https://www.better-auth.com/docs/integrations/tanstack)
documentation. Prisma projects must also complete the official
[Prisma setup](https://www.prisma.io/docs/orm/getting-started) and
[Better Auth Prisma adapter setup](https://www.better-auth.com/docs/adapters/prisma).

Install:

```bash
bun add @skycanvasstudio/sso better-auth
```

Merge this provider into the existing `betterAuth()` instance:

```ts
import { createSsoBetterAuthProvider } from "@skycanvasstudio/sso"
import { genericOAuth } from "better-auth/plugins"

const skycanvas = createSsoBetterAuthProvider({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL, // optional
  // forceLogin: true, // optional explicit reauthentication
})

export const auth = betterAuth({
  // Preserve existing database and options.
  account: { encryptOAuthTokens: true },
  plugins: [
    // Preserve existing plugins.
    genericOAuth({ config: [skycanvas] }),
  ],
})
```

Requirements:

- Mount the existing `auth.handler` for GET and POST using Better Auth's normal server adapter.
- Do not create separate SkyCanvas login, callback, profile, session, or logout routes.
- Use Better Auth's `genericOAuthClient()` and wrap that client with `createSsoBetterAuthClient()`.
- Use the wrapper for `signIn` and `signOut`; logout clears both the application and central SSO sessions by default.
- Keep using Better Auth's existing `auth.api.getSession` and `useSession` APIs.
- Do not import `@skycanvasstudio/sso/client` on this path. The optional controlled `/react` UI is safe to use.
- Preserve the existing account-linking policy. Do not enable forced linking without an explicit owner decision.

Server environment:

```text
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=at_least_32_random_characters
SSO_CLIENT_ID=the_real_client_id
# Optional; omit to use https://api-sso.skycanvasstudio.com
SSO_URL=https://api-sso.skycanvasstudio.com
```

Register exactly:

```text
http://localhost:3000/api/auth/oauth2/callback/skycanvas
https://your-domain.example/api/auth/oauth2/callback/skycanvas
```

Better Auth derives this URL from `BETTER_AUTH_URL`. Do not add `SSO_CALLBACK_URL`. The package does not read `SSO_URL` automatically; pass it as `baseUrl` when provided.

Browser client:

```ts
import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { createSsoBetterAuthClient } from "@skycanvasstudio/sso/better-auth"

export const authClient = createAuthClient({ plugins: [genericOAuthClient()] })
export const sso = createSsoBetterAuthClient({
  authClient,
  clientId: env.NEXT_PUBLIC_SSO_CLIENT_ID,
  baseUrl: env.NEXT_PUBLIC_SSO_URL,
})
```

## Path B: Another JavaScript auth library

Install:

```bash
bun add @skycanvasstudio/sso
```

Get canonical provider data:

```ts
import { createSsoProvider } from "@skycanvasstudio/sso"

const sso = createSsoProvider({ clientId: env.SSO_CLIENT_ID })
```

Map `providerId`, `clientId`, `authorizationUrl`, `tokenUrl`, `jwksUrl`, `scopes`, and `pkce` into the existing library's generic OAuth/OIDC provider. It must use Authorization Code + PKCE S256, state, nonce, and server-side token exchange.

Let the existing library continue to own callback routing, users, cookies, sessions, client hooks, and logout. Register the exact `redirect_uri` produced by that library.

Only if the library exposes the returned ID token but does not validate/map it, call this on the server:

```ts
import { verifySsoIdToken } from "@skycanvasstudio/sso/server"

const identity = await verifySsoIdToken({
  clientId: env.SSO_CLIENT_ID,
  idToken: tokens.id_token,
  nonce: expectedNonce,
})
```

Do not verify the same flow twice or create an additional session system.

## Path C: No auth library

Install:

```bash
bun add @skycanvasstudio/sso
```

Server environment:

```text
SSO_CLIENT_ID=the_real_client_id
APP_URL=http://localhost:3000
SESSION_SECRET=at_least_32_random_characters
```

Create one SSO server:

```ts
import { createSsoServer } from "@skycanvasstudio/sso/server"

export const sso = createSsoServer({
  clientId: env.SSO_CLIENT_ID,
  appUrl: env.APP_URL,
  sessionSecret: env.SESSION_SECRET,
})
```

Mount these routes:

```text
GET  /auth/login
GET  /auth/callback
GET  /auth/profile
POST /auth/logout
```

Forward a Web `Request` to `sso.handle(request)`. If the target router has separate files, forward to `sso.login`, `sso.callback`, `sso.profile`, or `sso.logout`. Use `sso.getSession(request)` in protected server code. Adapt non-Web framework requests without moving OAuth or cookie logic into the adapter.

The package handles PKCE, state, nonce, flow age, token exchange and verification, encrypted HttpOnly cookies, safe relative return paths, the local session, and logout origin checks. Use `onSignIn` only when the target app needs to map or persist the verified `user` before the session is created.

Register exactly:

```text
http://localhost:3000/auth/callback
https://your-domain.example/auth/callback
```

Browser client:

```ts
import { createSsoClient } from "@skycanvasstudio/sso/client"

export const ssoClient = createSsoClient()
```

For a separate frontend/backend, set `baseUrl` on `createSsoClient`, configure exact-origin credentialed CORS, and set the frontend origin as `redirectOrigin` and in `trustedOrigins` on `createSsoServer`. Never combine wildcard CORS with credentials.

Optional React integration:

```tsx
import "@skycanvasstudio/sso/styles.css"
import { SsoProvider, SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"

<SsoProvider client={ssoClient}>{children}</SsoProvider>
```

`SsoSignInButton` and `SsoUserMenu` work directly with this provider. `SsoUserMenu` renders its read-only Profile action first, caller-supplied items next, and global Logout last.

## Optional React UI for Better Auth

Use controlled props with Better Auth's session. Do not create application-specific SSO routes:

```tsx
import "@skycanvasstudio/sso/styles.css"
import { SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"
import { authClient, sso } from "./auth-client"

const { data } = authClient.useSession()

return data?.user ? (
  <SsoUserMenu
    user={data.user}
    items={[{ label: "Dashboard", href: "/dashboard" }]}
    onLogout={() => sso.signOut({ returnTo: "/" })}
  />
) : (
  <SsoSignInButton onSignIn={() => sso.signIn("/dashboard")} />
)
```

The UI uses the same Base UI primitives as the SSO web application's shadcn components. Import `@skycanvasstudio/sso/styles.css` once. It consumes shadcn CSS variables when present and supports both `.dark` and `[data-theme="dark"]`. Prefer `className` and component props for small adaptations; build custom UI with the hooks only when the requested design materially differs.

## Path D: Non-JavaScript backend

Do not install the npm package. Use a maintained OAuth 2.0/OpenID Connect library for that language.

```text
Authorization: https://api-sso.skycanvasstudio.com/api/auth/oauth2/authorize
Token:         https://api-sso.skycanvasstudio.com/api/auth/oauth2/token
JWKS:          https://api-sso.skycanvasstudio.com/api/auth/jwks
Metadata:      https://api-sso.skycanvasstudio.com/api/oauth/client-metadata?client_id=YOUR_CLIENT_ID
Scope:         openid
```

Use Authorization Code + PKCE S256. Generate state, nonce, and the verifier on the backend; retain them in a short-lived server-side or encrypted HttpOnly flow session. Exchange the code on the backend. Validate state, flow age, signature, issuer, audience, expiry, nonce, required claims, and matching access/ID-token subjects before creating the application's local session.

The browser-facing contract can remain `GET /auth/login`, `GET /auth/callback`, `GET /auth/profile`, and `POST /auth/logout`, but the backend library may choose different paths. Register its exact `redirect_uri`.

## Rules for every path

- OAuth tokens, the PKCE verifier, nonce, session secret, and flow state stay server-only.
- Never put OAuth tokens in local storage, session storage, React state, URLs, logs, or browser-readable cookies.
- Only redirect to validated relative paths or explicitly trusted origins.
- Use secure, HttpOnly, appropriately SameSite cookies and protect state-changing routes against cross-site requests.
- Keep server-only imports out of browser bundles.
- The production SSO base URL is `https://api-sso.skycanvasstudio.com`; override it only for a real staging or self-hosted deployment.

## Verification before completion

1. Run formatter, TypeScript/type checks, relevant auth tests, and a production build.
2. Confirm the authorization request contains the correct client ID, exact callback, `openid`, state, nonce, and PKCE S256 challenge.
3. Test a new user, returning user, session restoration, protected server access, and logout.
4. Test invalid state, nonce, code, issuer, audience, and expired tokens where the selected library permits.
5. Confirm no token or secret appears in client bundles, browser storage, URLs, or logs.
6. Confirm local, preview, and production callback URLs exactly match the SkyCanvas dashboard.

Report the chosen path, packages installed, files changed, exact callback URL, required environment values, verification commands/results, and any remaining dashboard action.
