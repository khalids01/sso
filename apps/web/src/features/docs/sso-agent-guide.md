# SkyCanvas SSO implementation guide for coding agents

Use the published `@skycanvasstudio/sso` package as a normal consumer. Do not
import package source files or copy OAuth, cookie, or token-verification logic
into the application.

## First choose one session owner

1. **React-only public client**: the SkyCanvas browser SDK owns the local
   short-lived token session; the application API verifies Bearer tokens.
2. **Better Auth**: Better Auth owns users, accounts, callback handling, cookies,
   and sessions.
3. **Another auth library**: that library owns the callback and session; use
   SkyCanvas provider metadata only.
4. **Full-stack without an auth library**: `createSsoServer` owns the OAuth flow and encrypted local
   application session.
5. **Non-JavaScript backend**: use a maintained OAuth 2.0/OIDC library; do not
   install the npm package.

Never combine Better Auth session hooks with the standalone `SsoProvider`.

## Environment rule

Session secrets and full-stack configuration belong in the application's
server-only env module. Pass explicit values to SkyCanvas exactly once and never
pass the complete environment object. A React-only public client intentionally
uses `VITE_SKYCANVAS_PUBLISHABLE_KEY` and `VITE_SKYCANVAS_SSO_URL`; the
publishable key is an identifier, not a secret.

## React-only path

Use this for a Vite/SPA application that should not run an auth callback server.
Register the exact frontend origin and `{APP_ORIGIN}/auth/callback`. The host
must serve the SPA entry at `/auth/callback`.

```tsx
import { SkyCanvasProvider } from "@skycanvasstudio/sso/react"
import "@skycanvasstudio/sso/styles.css"

<SkyCanvasProvider
  publishableKey={import.meta.env.VITE_SKYCANVAS_PUBLISHABLE_KEY}
  ssoUrl={import.meta.env.VITE_SKYCANVAS_SSO_URL}
>
  <App />
</SkyCanvasProvider>
```

Use `SignIn`, `SignedIn`, `SignedOut`, `useAuth`, and `useUser`. Send the result
of `useAuth().getToken()` as a Bearer token only to the intended application
API. Create one `createSsoAccessTokenVerifier()` in that API process and verify
each protected request. Treat `SignedIn` as presentation control, not backend
authorization. Do not add `createSsoServer`, Elysia, a client secret, or a second
callback to this path.

`SignIn` must remain embedded and show the password, magic-link, and social
methods returned by the application's public metadata. Password and magic-link
forms call central SkyCanvas directly. Only social provider buttons open a
popup, with the selected provider passed so the popup continues into that
provider rather than showing a second generic SkyCanvas login page.

## Better Auth path

Before SkyCanvas work, verify Better Auth installation, database adapter,
generated schema, migrations, server handler, browser client, and normal
sign-in/session behavior using Better Auth's official documentation.

Server configuration (`src/lib/auth.ts`):

```ts
import { skycanvas } from "@skycanvasstudio/sso/better-auth"
import { betterAuth } from "better-auth"
import { env } from "./env.server"

export const auth = betterAuth({
  // Preserve the existing database, plugins, and options.
  account: { encryptOAuthTokens: true },
  plugins: [skycanvas({
    publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
    ssoUrl: env.SKYCANVAS_SSO_URL,
  })],
})
```

For TanStack Start, `tanstackStartCookies()` must remain the final plugin in
the array. The SSO server uses a distinct cookie prefix, so a local service app
and local SSO server cannot overwrite each other's OAuth state cookies merely
because both use the `localhost` hostname.

Mount `auth.handler` only through Better Auth's normal framework route. Register
exactly `{BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas`. Do not create a
second callback or standalone `createSsoServer` instance.

Browser integration (`src/lib/auth-client.ts`):

```ts
import { skycanvasClient } from "@skycanvasstudio/sso/better-auth"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({ plugins: [skycanvasClient()] })

export const signInWithSkyCanvas = (callbackURL = "/dashboard") =>
  authClient.signIn.oauth2({ providerId: "skycanvas", callbackURL })
```

Keep using Better Auth's existing session hooks, provider, user types, route,
and sign-out behavior. Do not add a second SkyCanvas provider or bootstrap
layer to the React tree.

## Another auth library

Call `createSsoProvider({ publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY, ssoUrl: env.SKYCANVAS_SSO_URL })`
on the server and map its endpoints into the existing library. The library must
use Authorization Code, PKCE S256, state, nonce, server-side token exchange,
JWKS signature verification, issuer, audience, expiry, and subject validation.
Keep its own callback, session, user types, and logout behavior.

## Standalone path

For TanStack Start, configure the adapter once:

```ts
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start"
import { env } from "./env.server"

export const skycanvas = createTanStackSso({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
})
```

Mount its middleware once:

```ts
import { createServerOnlyFn, createStart } from "@tanstack/react-start"
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start"

const load = createServerOnlyFn(() =>
  import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [createTanStackSsoMiddleware(load)],
}))
```

For Next.js use `createNextSso()` with the same three values and export its
`GET`, `POST`, and `OPTIONS` handlers from `app/auth/[...sso]/route.ts`. The SDK
infers the public app origin and `/auth/callback` URL from the request. Set
`appUrl` only when a proxy does not forward the original host and protocol.

Mount `SkyCanvasProvider` once and use the packaged `SignIn`, `SignedIn`,
`SignedOut`, `useAuth`, and `SsoUserMenu` APIs. Register
`{APP_ORIGIN}/auth/callback` in SkyCanvas.

## Required verification

- Missing values and invalid URLs produce actionable configuration errors.
- The bootstrap is plain serializable data and contains no secrets or functions.
- A returning SSR session renders authenticated without a flash or initial
  profile request.
- New-user login, returning-user login, callback rejection, protected routes,
  local/global logout, and safe local return paths work.
- TanStack never imports or returns the SSO server object through a server
  function; only the bootstrap crosses the boundary.
- Better Auth, generic-library, and full-stack standalone flows keep OAuth
  tokens, flow state, nonce, verifier, and session secrets server-only.
- The React-only flow keeps PKCE state and the short-lived application token in
  the SDK-managed browser session; protected APIs verify every Bearer token and
  no session secret exists in the frontend.
