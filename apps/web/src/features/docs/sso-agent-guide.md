# SkyCanvas SSO implementation guide for coding agents

Use the published `@skycanvasstudio/sso` package as a normal consumer. Do not
import package source files or copy OAuth, cookie, or token-verification logic
into the application.

## First choose one session owner

1. **Better Auth**: Better Auth owns users, accounts, callback handling, cookies,
   and sessions.
2. **Another auth library**: that library owns the callback and session; use
   SkyCanvas provider metadata only.
3. **No auth library**: `createSsoServer` owns the OAuth flow and encrypted local
   application session.
4. **Non-JavaScript backend**: use a maintained OAuth 2.0/OIDC library; do not
   install the npm package.

Never combine Better Auth session hooks with the standalone `SsoProvider`.

## Environment rule

Read and validate environment values in the application's server-only env
module. Pass explicit values to SkyCanvas exactly once. Never pass the complete
environment object and never create `VITE_SSO_*` or `NEXT_PUBLIC_SSO_*` copies.

## Better Auth path

Before SkyCanvas work, verify Better Auth installation, database adapter,
generated schema, migrations, server handler, browser client, and normal
sign-in/session behavior using Better Auth's official documentation.

Server configuration (`src/lib/auth.ts`):

```ts
import { createSsoBetterAuthIntegration } from "@skycanvasstudio/sso/better-auth"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { env } from "./env.server"

export const skycanvas = createSsoBetterAuthIntegration({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL,
})

export const auth = betterAuth({
  // Preserve the existing database, plugins, and options.
  account: { encryptOAuthTokens: true },
  plugins: [genericOAuth({ config: [skycanvas.provider] })],
})
```

Mount `auth.handler` only through Better Auth's normal framework route. Register
exactly `{BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas`. Do not create a
second callback or standalone `createSsoServer` instance.

Browser integration (`src/lib/auth-client.ts`):

```ts
import { createSsoBetterAuthReact } from "@skycanvasstudio/sso/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({ plugins: [genericOAuthClient()] })
export const { SsoProvider, useSso, useSsoSession } =
  createSsoBetterAuthReact(authClient)
```

For TanStack Start, keep `createServerFn` in application source and use a lazy
server import:

```ts
import { createServerFn } from "@tanstack/react-start"
import { getTanStackBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getInitialAuthSession = createServerFn({ method: "GET" }).handler(
  () => getTanStackBetterAuthSsoBootstrap(async () => {
    const { auth, skycanvas } = await import("./auth")
    return { auth, skycanvas }
  }),
)
```

For Next.js, call `getNextBetterAuthSsoBootstrap({ auth, skycanvas })` from the
server layout. Mount the `SsoProvider` returned by `createSsoBetterAuthReact`
with `bootstrap={bootstrap}` above all SSO hooks.

Use `useSso()` for `user`, `session`, `isPending`, `error`, `signIn`, and
`signOut`. Types are inferred from the configured Better Auth client, including
custom user fields. `SsoUser` is not a replacement for Better Auth's user type.

## Another auth library

Call `createSsoProvider({ clientId: env.SSO_CLIENT_ID, baseUrl: env.SSO_URL })`
on the server and map its endpoints into the existing library. The library must
use Authorization Code, PKCE S256, state, nonce, server-side token exchange,
JWKS signature verification, issuer, audience, expiry, and subject validation.
Keep its own callback, session, user types, and logout behavior.

## Standalone path

Create only one server configuration module:

```ts
// src/lib/sso.server.ts
import { createSsoServer } from "@skycanvasstudio/sso/server"
import { env } from "./env.server"

export const sso = createSsoServer({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL,
  appUrl: env.APP_URL,
  sessionSecret: env.SESSION_SECRET,
})
```

Mount `sso.handle(request)` for `/auth/*`. TanStack Start, Next.js, and Elysia
already expose Web requests. For Express and NestJS, use
`createNodeSsoHandler(sso)` from `@skycanvasstudio/sso/node` and use
`nodeRequestHeaders(request)` when only session/bootstrap data is required.

TanStack SSR:

```ts
import { createServerFn } from "@tanstack/react-start"
import { getTanStackStandaloneSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getSsoBootstrap = createServerFn({ method: "GET" }).handler(
  () => getTanStackStandaloneSsoBootstrap(
    () => import("./sso.server").then(({ sso }) => sso),
  ),
)
```

Next.js SSR uses `getNextStandaloneSsoBootstrap({ sso })`. Elysia can call
`sso.getBootstrap(request)`. Express and NestJS can call
`sso.getBootstrap(nodeRequestHeaders(request))`.

Mount the package React provider directly. `SsoSignInButton` and `SsoUserMenu`
read its session internally; do not import standalone `useSso()` or
`useSsoSession()` hooks from `/react`.

```tsx
import { SsoProvider } from "@skycanvasstudio/sso/react"

<SsoProvider bootstrap={bootstrap}>{children}</SsoProvider>
```

Do not create `sso-client.ts` or an application session-provider wrapper.
Register `sso.callbackUrl`, normally `{APP_URL}/auth/callback`.

## Required verification

- Missing values and invalid URLs produce actionable configuration errors.
- The bootstrap is plain serializable data and contains no secrets or functions.
- A returning SSR session renders authenticated without a flash or initial
  profile request.
- New-user login, returning-user login, callback rejection, protected routes,
  local/global logout, and safe local return paths work.
- TanStack never imports or returns the SSO server object through a server
  function; only the bootstrap crosses the boundary.
- OAuth tokens, flow state, nonce, verifier, and session secrets remain server-only.
