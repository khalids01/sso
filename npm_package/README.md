# @skycanvasstudio/sso

Clerk-style authentication for SkyCanvas SSO, with an optional Better Auth adapter.

Documentation: https://sso.skycanvasstudio.com/docs

## Install

```bash
bun add @skycanvasstudio/sso
```

For a new application, use the standalone integration below. Your application
does **not** install Better Auth or create auth tables. Better Auth remains an
internal implementation detail of the SkyCanvas SSO service.

## Environment variables

For the standalone Clerk-like integration, all SkyCanvas environment variables
are **server-only**, including `SKYCANVAS_PUBLISHABLE_KEY`. The packaged React
UI receives safe configuration from the server bootstrap and local auth routes.
Do not create `VITE_SKYCANVAS_*` or `NEXT_PUBLIC_SKYCANVAS_*` variables.

```bash
# server environment only
SKYCANVAS_PUBLISHABLE_KEY=your_client_id
SKYCANVAS_SECRET_KEY=replace_with_at_least_32_random_characters
SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com
```

## TanStack Start quickstart (recommended)

Create one server-only module:

```ts
// src/lib/skycanvas.server.ts
import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start"
import { env } from "./env.server"

export const skycanvas = createTanStackSso({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
  interactionMode: "embedded", // or "hosted"
  oauthMode: "popup",          // or "redirect"
})
```

Add its middleware:

```ts
// src/start.ts
import { createServerOnlyFn, createStart } from "@tanstack/react-start"
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start"

const loadSkycanvas = createServerOnlyFn(
  () => import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
)
const skycanvasMiddleware = createTanStackSsoMiddleware(
  loadSkycanvas,
)

export const startInstance = createStart(() => ({
  requestMiddleware: [skycanvasMiddleware],
}))
```

Keep the `createServerOnlyFn` boundary exactly as shown. It prevents the server
secret and server-only module from entering TanStack's client graph.

Wrap the root and render the packaged UI anywhere—page, card, or modal:

```tsx
import "@skycanvasstudio/sso/styles.css"
import { SignIn, SkyCanvasProvider } from "@skycanvasstudio/sso/react"

<SkyCanvasProvider>
  <SignIn returnTo="/dashboard" />
</SkyCanvasProvider>
```

`SignIn`, `SignUp`, `SsoAuth`, and `SsoAuthDialog` read the application policy
from SkyCanvas and only show enabled methods. Password and magic-link forms stay
inside the application. Social providers use a small popup by default. Google,
GitHub, Facebook, and LinkedIn continue to use the single callback configured
on the SkyCanvas SSO service; consuming applications do not add provider
callbacks or JavaScript origins in Google.

Server code can read the session with `await skycanvas.auth()`. The middleware
also exposes `context.skycanvasAuth` to subsequent request middleware/routes.

In the SkyCanvas dashboard, register the application callback
`{APP_URL}/auth/callback` and its allowed origin. This is SkyCanvas application
configuration, not a Google OAuth change.

The publishable key is the application client ID from SkyCanvas. `secretKey`
encrypts this application's local session cookie; generate it with
`openssl rand -base64 32` and never expose it to browser code.

## Integration choices

Choose exactly one session owner:

1. Better Auth already owns your users and sessions.
2. Another OAuth/OIDC library owns your users and sessions.
3. SkyCanvas owns a standalone encrypted application session (recommended for new apps).

Do not combine Better Auth session APIs with the standalone `SsoProvider`.

## Better Auth

Complete Better Auth's installation, database adapter, schema generation, server
route, and browser client first. SkyCanvas does not create Better Auth tables.

Configure SkyCanvas once in the server-only Better Auth file:

```ts
// src/lib/auth.ts
import { createSsoBetterAuthIntegration } from "@skycanvasstudio/sso/better-auth"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { env } from "./env.server"

export const skycanvas = createSsoBetterAuthIntegration({
  clientId: env.SSO_CLIENT_ID,
  baseUrl: env.SSO_URL,
})

export const auth = betterAuth({
  // Preserve your database and existing options.
  account: { encryptOAuthTokens: true },
  plugins: [genericOAuth({ config: [skycanvas.provider] })],
})
```

On TanStack Start, keep Better Auth's `tanstackStartCookies()` plugin last in
the `plugins` array. SkyCanvas SSO uses its own cookie prefix, so local SSO and
application servers on different `localhost` ports do not overwrite each
other's OAuth state cookies.

There are no `VITE_SSO_*` or `NEXT_PUBLIC_SSO_*` variables. The SSR bootstrap
contains only the session and safe public values; secrets and server functions
are never serialized.

Create the normal Better Auth browser client, then create the typed React
integration without repeating configuration:

```ts
// src/lib/auth-client.ts
import { createSsoBetterAuthReact } from "@skycanvasstudio/sso/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const { SsoProvider, useSso, useSsoSession } =
  createSsoBetterAuthReact(authClient)
```

### TanStack Start SSR

Keep `createServerFn` in application source and lazily import the server module:

```ts
// src/lib/auth-session.ts
import { createServerFn } from "@tanstack/react-start"
import { getTanStackBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getInitialAuthSession = createServerFn({ method: "GET" }).handler(
  () => getTanStackBetterAuthSsoBootstrap(async () => {
    const { auth, skycanvas } = await import("./auth")
    return { auth, skycanvas }
  }),
)
```

```tsx
// src/routes/__root.tsx (relevant part)
import { SsoProvider } from "@/lib/auth-client"
import { getInitialAuthSession } from "@/lib/auth-session"

export const Route = createRootRoute({
  loader: async () => ({ bootstrap: await getInitialAuthSession() }),
  component: Root,
})

function Root() {
  const { bootstrap } = Route.useLoaderData()
  return <SsoProvider bootstrap={bootstrap}><Outlet /></SsoProvider>
}
```

### Next.js SSR

```tsx
// app/layout.tsx
import { getNextBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/next"
import { SsoProvider } from "@/lib/auth-client"
import { auth, skycanvas } from "@/lib/auth"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getNextBetterAuthSsoBootstrap({ auth, skycanvas })
  return <html><body><SsoProvider bootstrap={bootstrap}>{children}</SsoProvider></body></html>
}
```

Use the package-owned session and actions below the provider:

```tsx
import { SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"
import { useSso } from "@/lib/auth-client"

export function AccountMenu() {
  const { user, isPending, signIn, signOut } = useSso()
  if (isPending) return <span>Loading…</span>
  return user ? (
    <SsoUserMenu user={user} onLogout={() => signOut({ returnTo: "/" })} />
  ) : (
    <SsoSignInButton onSignIn={() => signIn("/dashboard")} />
  )
}
```

Better Auth owns the exact user and session types. The factory infers them from
`authClient`; they remain available as `typeof authClient.$Infer.Session` and
`typeof authClient.$Infer.Session["user"]`.

Register:

```text
{BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas
```

## Low-level standalone session API

Configure all four values once in the only required SSO module:

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

Mount `sso.handle(request)` for the complete `/auth/*` namespace. It owns the
login/callback, public UI configuration, embedded password and magic-link,
profile, and logout endpoints. Elysia, TanStack Start, and Next.js use Web
`Request`/`Response` directly. Express and NestJS can use:

```ts
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node"
import { sso } from "./sso.server"

export const handleSso = createNodeSsoHandler(sso)
```

For TanStack Start, load SSR data lazily:

```ts
// src/lib/sso-session.ts
import { createServerFn } from "@tanstack/react-start"
import { getTanStackStandaloneSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getSsoBootstrap = createServerFn({ method: "GET" }).handler(
  () => getTanStackStandaloneSsoBootstrap(
    () => import("./sso.server").then(({ sso }) => sso),
  ),
)
```

For Next.js:

```ts
const bootstrap = await getNextStandaloneSsoBootstrap({ sso })
```

Mount the package provider directly; it creates the browser client from the
bootstrap, so no `sso-client.ts` or application wrapper is needed. For new
TanStack Start applications, prefer the shorter `createTanStackSso` quickstart
above, which does not require a bootstrap loader:

```tsx
import { SsoProvider } from "@skycanvasstudio/sso/react"

<SsoProvider bootstrap={bootstrap}>{children}</SsoProvider>
```

Register `sso.callbackUrl`, normally `{APP_URL}/auth/callback`.

## Types and exports

```ts
import type {
  SsoBetterAuthBootstrap,
  SsoPublicConfig,
  SsoSession,
  SsoUser,
  StandaloneSsoBootstrap,
} from "@skycanvasstudio/sso/types"
```

Available entry points: package root, `/better-auth`, `/server`, `/client`,
`/react`, `/tanstack-start`, `/next`, `/node`, `/types`, and `/styles.css`.
