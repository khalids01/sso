# @skycanvasstudio/sso

Clerk-like authentication for full-stack JavaScript applications using your
SkyCanvas SSO deployment. The package provides popup OAuth, PKCE, encrypted
HttpOnly application sessions, React UI/hooks, and server adapters.

## Install

```bash
bun add @skycanvasstudio/sso react-hook-form
```

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
  clientId: process.env.SKYCANVAS_PUBLISHABLE_KEY!,
  baseUrl: process.env.SKYCANVAS_SSO_URL,
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

## TanStack Start

```ts
// src/lib/skycanvas.server.ts
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start"

export const skycanvas = createTanStackSso({
  publishableKey: process.env.SSO_CLIENT_ID!,
  secretKey: process.env.SESSION_SECRET!,
  appUrl: process.env.APP_URL!,
  ssoUrl: process.env.SSO_URL!,
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
  clientId: process.env.SSO_CLIENT_ID!,
  sessionSecret: process.env.SESSION_SECRET!,
  appUrl: process.env.APP_URL!,
  baseUrl: process.env.SSO_URL!,
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

## React frontend + Elysia API

```ts
// api/auth.ts
import { createElysiaSso } from "@skycanvasstudio/sso/elysia"
import { createSsoServer } from "@skycanvasstudio/sso/server"

const sso = createSsoServer({
  clientId: process.env.SSO_CLIENT_ID!,
  sessionSecret: process.env.SESSION_SECRET!,
  baseUrl: process.env.SSO_URL!,
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

Reference applications live in `apps/sso-demo`, `apps/sso-demo-elysia`, and
`apps/sso-demo-next` in the source repository.
