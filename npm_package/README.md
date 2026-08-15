# @skycanvasstudio/sso

Clerk-like authentication for full-stack JavaScript applications using your
SkyCanvas SSO deployment. The package provides popup OAuth, PKCE, encrypted
HttpOnly application sessions, React UI/hooks, and server adapters.

## Install

```bash
bun add @skycanvasstudio/sso
```

`react-hook-form` is used internally by the packaged `<SignIn />` and
`<SignUp />` components, so application projects do not need to install it.

Import the packaged styles once:

```ts
import "@skycanvasstudio/sso/styles.css"
```

Register the exact callback URL shown for your framework and the browser app
origin in the SSO application client. Clients are public OAuth clients using
`authorization_code`, `openid`, PKCE `S256`, and token auth method `none`.

## React-only app (no auth server)

Register `https://app.example.com/auth/callback` as an exact redirect URI and
`https://app.example.com` as an allowed origin. Then wrap the app once:

```tsx
import { SkyCanvasProvider } from "@skycanvasstudio/sso/react"
import "@skycanvasstudio/sso/styles.css"

<SkyCanvasProvider
  publishableKey={import.meta.env.VITE_SKYCANVAS_PUBLISHABLE_KEY}
  ssoUrl="https://api-sso.skycanvasstudio.com"
>
  <App />
</SkyCanvasProvider>
```

This public-client mode uses authorization code + PKCE. The central SkyCanvas
deployment owns upstream OAuth callbacks, its SSO cookie, authorization-code
validation, token issuance, and JWKS. The React app does not run Elysia or keep
a client secret.

## React API

```tsx
import {
  SignIn,
  SignedIn,
  SignedOut,
  SsoUserMenu,
  useAuth,
  useUser,
} from "@skycanvasstudio/sso/react"

function Account() {
  const { isLoaded, isSignedIn, session, getToken, signOut } = useAuth()
  const { user } = useUser()

  return <>
    <SignedOut><SignIn returnTo="/dashboard" /></SignedOut>
    <SignedIn>
      <span>{user?.email}</span>
      <SsoUserMenu logoutReturnTo="/" />
      <button onClick={() => void signOut({ returnTo: "/" })}>Sign out</button>
    </SignedIn>
  </>
}
```

After password or popup OAuth succeeds, `SignIn` and `SignUp` navigate the
original window to their safe relative `returnTo` path. Providing `onSuccess`
instead gives your application control of navigation, which is useful for auth
dialogs and client routers.

Call an application API with the short-lived app-scoped access token:

```ts
const token = await getToken()
await fetch("/api/orders", {
  headers: { authorization: `Bearer ${token}` },
})
```

Verify it in that API without calling SkyCanvas on every request:

```ts
import { createSsoAccessTokenVerifier } from "@skycanvasstudio/sso/server"

const skycanvas = createSsoAccessTokenVerifier({
  publishableKey: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
  ssoUrl: process.env.SKYCANVAS_SSO_URL!,
})
const auth = await skycanvas.verify(
  request.headers.get("authorization")!.slice(7),
)

console.log(auth.subject)
```

In a React-only app, `SignIn` and `SignUp` fetch the application's public auth
policy and render its enabled password, magic-link, and social methods directly
inside the application. Password and magic-link requests go to the central
SkyCanvas backend without an app auth server. Only a selected social provider
opens a centered popup (or redirects when configured/blocked), and that popup
continues directly into the chosen provider such as Google or GitHub.

The popup is created synchronously when the user clicks a social provider and
immediately paints a small `Connecting securely` screen. The SDK prepares PKCE
and loads SkyCanvas in that same window, so applications do not need to build a
popup loading route or add configuration for this transition.

React-only applications restore their session and public auth policy after the
browser app starts, so their initial loading state is client-side. Next.js and
TanStack Start applications can pass the documented server bootstrap into
`SsoProvider` during SSR, avoiding that initial session-loading flash. OAuth
navigation still involves SkyCanvas and the upstream provider in every mode;
the immediate popup shell covers that unavoidable network transition.

## TanStack Start

```ts
// src/lib/skycanvas.server.ts
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start"

export const skycanvas = createTanStackSso({
  publishableKey: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
  secretKey: process.env.SKYCANVAS_SECRET_KEY!,
  ssoUrl: process.env.SKYCANVAS_SSO_URL!,
  interactionMode: "embedded",
  oauthMode: "popup",
})
```

```ts
// src/start.ts
import { createServerOnlyFn, createStart } from "@tanstack/react-start"
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start"

const load = createServerOnlyFn(() =>
  import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
)

export const startInstance = createStart(() => ({
  requestMiddleware: [createTanStackSsoMiddleware(load)],
}))
```

Load `skycanvas.getBootstrap()` in a server loader and pass it to
`<SkyCanvasProvider bootstrap={bootstrap}>`. Register
`https://app.example.com/auth/callback`.

## Next.js App Router

```ts
// lib/skycanvas.ts
import { createNextSso } from "@skycanvasstudio/sso/next"

export const skycanvas = createNextSso({
  publishableKey: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
  secretKey: process.env.SKYCANVAS_SECRET_KEY!,
  ssoUrl: process.env.SKYCANVAS_SSO_URL!,
  appUrl: process.env.APP_URL!,
  oauthMode: "popup",
})
```

```ts
// app/auth/[...sso]/route.ts
import { skycanvas } from "@/lib/skycanvas"

export const { GET, POST, OPTIONS } = skycanvas.handlers
```

In the server layout, call `await skycanvas.getBootstrap()` and wrap children
with `<SkyCanvasProvider bootstrap={bootstrap}>`. Protect server pages with
`const auth = await skycanvas.auth()`. Register
`https://app.example.com/auth/callback`.

Set `APP_URL=http://localhost:3000` locally and the public HTTPS origin in
production. An explicit application URL prevents servers bound to `0.0.0.0`
or running behind a proxy from generating an invalid OAuth callback.

## React frontend + Elysia API

```ts
// api/auth.ts
import { createElysiaSso } from "@skycanvasstudio/sso/elysia"
import { createSsoServer } from "@skycanvasstudio/sso/server"

const sso = createSsoServer({
  publishableKey: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
  secretKey: process.env.SKYCANVAS_SECRET_KEY!,
  ssoUrl: process.env.SKYCANVAS_SSO_URL!,
  appUrl: "https://api.example.com",
  redirectOrigin: "https://app.example.com",
  trustedOrigins: ["https://app.example.com"],
  oauthMode: "popup",
})

app.use(createElysiaSso(sso))
```

```tsx
// React entry
<SkyCanvasProvider baseUrl="https://api.example.com">
  <App />
</SkyCanvasProvider>
```

Register `https://api.example.com/auth/callback` as the redirect URI and
`https://app.example.com` as the allowed browser origin. Credentialed CORS is
added for trusted origins. If frontend and API are on different sites, use
HTTPS and `cookies: { sameSite: "none", secure: true }`; sibling subdomains are
normally same-site.

## Generic server

`createSsoServer()` uses standard Web `Request` and `Response` objects. Mount
`sso.handle(request)` for `/auth/*`. Node/Express-like servers can use
`createNodeSsoHandler()` from `@skycanvasstudio/sso/node`.

The application origin and `/auth/callback` URL can be inferred from the
request, but setting `appUrl` explicitly is recommended for production,
containers, proxies, and development servers bound to `0.0.0.0`.

## Existing Better Auth app

```ts
import { skycanvas } from "@skycanvasstudio/sso/better-auth"

export const auth = betterAuth({
  // Keep your existing database, providers, and options.
  plugins: [skycanvas({
    publishableKey: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
    ssoUrl: process.env.SKYCANVAS_SSO_URL!,
  })],
})
```

Use `skycanvasClient()` in the existing Better Auth browser client. Better Auth
continues to own that application's session and callback route.

The package owns these routes by default:

```text
/auth/login
/auth/callback
/auth/config
/auth/password/login
/auth/password/signup
/auth/magic-link
/auth/profile
/auth/logout
```

## Security model

- State, nonce, and PKCE verifier live in a short-lived encrypted HttpOnly cookie.
- Authorization codes are exchanged server-side and burned once.
- Access and ID tokens are verified against SSO JWKS, issuer, audience, subject,
  and nonce before a local session is created.
- OAuth tokens are never returned to React, URLs, localStorage, or sessionStorage.
- Local sessions are encrypted, HttpOnly, and cannot outlive issued tokens.
- Return paths are restricted to local application paths.

React-only mode cannot receive a first-party `HttpOnly` cookie from an unrelated
SkyCanvas domain. It therefore keeps the verified ten-minute token in memory and,
by default, `sessionStorage` for reload continuity. Use `tokenCache="memory"` for
the smallest XSS exposure window. Apps that require first-party cookie sessions
should use the Next.js/TanStack/server adapter above; the login UI and OAuth
provider callbacks still remain centralized.

## Verification

```bash
bun run check-types
bun test
bun run build
bun run verify:package
```
