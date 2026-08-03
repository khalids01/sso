import type { CodeSample } from "./integration-guide-content";

export type GuideMode = "better" | "other" | "manual" | "language";

export type PackageRecipe = {
  label: string;
  shortLabel: string;
  description: string;
  callbackPath: string | null;
  samples: CodeSample[];
};

export const packageRecipes: Record<GuideMode, PackageRecipe> = {
  better: {
    label: "Use SSO with Better Auth",
    shortLabel: "Existing Better Auth",
    description:
      "Choose this only after Better Auth and its database already work in your application. Register {BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas. The adapter supplies the SkyCanvas OAuth configuration; Better Auth keeps owning callbacks, cookies, accounts, client hooks, and logout.",
    callbackPath: "/api/auth/oauth2/callback/skycanvas",
    samples: [
      {
        title: "Install",
        filename: "Terminal",
        description: "Install both packages in the project that contains your Better Auth server configuration.",
        code: `bun add @skycanvasstudio/sso better-auth`,
      },
      {
        title: "Configure the server environment",
        tabLabel: "TanStack Start / Vite",
        filename: ".env",
        description: "Keep secrets server-only. The client ID and SSO URL are public configuration; use your framework's required public prefix.",
        code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_at_least_32_random_characters
SSO_CLIENT_ID=your_skycanvas_client_id
SSO_URL=https://api-sso.skycanvasstudio.com

# Exposed by Vite; these are public, not secrets.
VITE_SSO_CLIENT_ID=your_skycanvas_client_id
VITE_SSO_URL=https://api-sso.skycanvasstudio.com`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: ".env.local",
            code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_at_least_32_random_characters
SSO_CLIENT_ID=your_skycanvas_client_id
SSO_URL=https://api-sso.skycanvasstudio.com

# Exposed by Next.js; these are public, not secrets.
NEXT_PUBLIC_SSO_CLIENT_ID=your_skycanvas_client_id
NEXT_PUBLIC_SSO_URL=https://api-sso.skycanvasstudio.com`,
          },
        ],
      },
      {
        title: "Add the provider to Better Auth",
        filename: "src/lib/auth.ts",
        description: "Merge this plugin into your existing Better Auth instance. Preserve its database, plugins, and other sign-in methods.",
        code: `import { createSsoBetterAuthProvider } from "@skycanvasstudio/sso"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"

const skycanvas = createSsoBetterAuthProvider({
  clientId: process.env.SSO_CLIENT_ID!,
  baseUrl: process.env.SSO_URL!,
  // forceLogin: true, // optional explicit reauthentication
})

export const auth = betterAuth({
  // Keep your existing database and auth options.
  account: { encryptOAuthTokens: true },
  plugins: [
    // Keep your existing plugins here.
    genericOAuth({ config: [skycanvas] }),
  ],
})`,
      },
      {
        title: "Keep your normal Better Auth route",
        tabLabel: "TanStack Start",
        filename: "src/routes/api/auth/$.ts (TanStack Start example)",
        description: "Choose your framework. Mount the same Better Auth instance at its normal catch-all route; do not add a second SkyCanvas callback handler.",
        code: `import { auth } from "@/lib/auth"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/auth/\$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
})`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "app/api/auth/[...all]/route.ts",
            code: `import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)`,
          },
          {
            tabLabel: "Express",
            filename: "src/server.ts",
            code: `import express from "express"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./lib/auth"

const app = express()

// Use "/api/auth/*splat" instead when running Express 5.
app.all("/api/auth/*", toNodeHandler(auth))

// Body parsing must be registered after the Better Auth handler.
app.use(express.json())`,
          },
          {
            tabLabel: "Elysia",
            filename: "src/index.ts",
            code: `import { Elysia } from "elysia"
import { auth } from "./lib/auth"

const app = new Elysia()
  .mount(auth.handler)
  .listen(3000)`,
          },
          {
            tabLabel: "NestJS",
            filename: "src/app.module.ts",
            code: `import { Module } from "@nestjs/common"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { auth } from "./lib/auth"

@Module({
  imports: [AuthModule.forRoot({ auth })],
})
export class AppModule {}

// Also create the Nest app with { bodyParser: false } in main.ts.`,
          },
        ],
      },
      {
        title: "Create the browser client",
        tabLabel: "TanStack Start / Vite",
        filename: "src/lib/auth-client.ts",
        description: "Wrap Better Auth once. Choose the tab matching your frontend so its public environment variables are available in browser code.",
        code: `import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { createSsoBetterAuthClient } from "@skycanvasstudio/sso/better-auth"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const sso = createSsoBetterAuthClient({
  authClient,
  clientId: import.meta.env.VITE_SSO_CLIENT_ID,
  baseUrl: import.meta.env.VITE_SSO_URL,
})

// On the server, keep using auth.api.getSession({ headers }).`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "src/lib/auth-client.ts",
            code: `import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { createSsoBetterAuthClient } from "@skycanvasstudio/sso/better-auth"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const sso = createSsoBetterAuthClient({
  authClient,
  clientId: process.env.NEXT_PUBLIC_SSO_CLIENT_ID!,
  baseUrl: process.env.NEXT_PUBLIC_SSO_URL,
})`,
          },
        ],
      },
      {
        title: "Add the optional ready-made UI",
        filename: "src/components/account-menu.tsx (example)",
        description: "Import the stylesheet once. The menu shows read-only Profile first, custom items next, and Logout last. It follows shadcn theme variables and dark mode.",
        code: `import "@skycanvasstudio/sso/styles.css"
import { SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"
import { authClient, sso } from "./auth-client"

export function AccountMenu() {
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
}`,
      },
      {
        title: "Register the callback URL",
        filename: "SkyCanvas dashboard (not a project file)",
        description: "Register the exact Better Auth callback for every environment. Better Auth derives it from BETTER_AUTH_URL; do not add SSO_CALLBACK_URL.",
        code: `http://localhost:3000/api/auth/oauth2/callback/skycanvas
https://your-domain.example/api/auth/oauth2/callback/skycanvas`,
      },
    ],
  },

  other: {
    label: "Use SSO with another auth library",
    shortLabel: "Another auth library",
    description:
      "Choose this when another OAuth or OpenID Connect library already owns your callback and local session. The package supplies canonical provider data and an optional ID-token verifier.",
    callbackPath: null,
    samples: [
      {
        filename: "Install",
        description: "Keep your existing auth library; add only the SSO package.",
        code: `bun add @skycanvasstudio/sso`,
      },
      {
        filename: "Read the provider configuration",
        description: "Pass these values into your library's generic OAuth/OIDC provider configuration.",
        code: `import { createSsoProvider } from "@skycanvasstudio/sso"

const sso = createSsoProvider({
  clientId: process.env.SSO_CLIENT_ID!,
})

// Map these into your auth library:
sso.providerId       // "skycanvas"
sso.clientId
sso.authorizationUrl
sso.tokenUrl
sso.jwksUrl
sso.scopes           // ["openid"]
sso.pkce             // true`,
      },
      {
        filename: "Configure your auth library",
        description: "Use Authorization Code + PKCE. Your auth library must generate and validate state and nonce, then create its own local session.",
        code: `const genericProvider = {
  id: sso.providerId,
  clientId: sso.clientId,
  authorizationUrl: sso.authorizationUrl,
  tokenUrl: sso.tokenUrl,
  jwksUrl: sso.jwksUrl,
  scopes: sso.scopes,
  pkce: sso.pkce,
  // callbackUrl: use the exact callback generated by your auth library
}`,
      },
      {
        filename: "Optional verified user mapping",
        description: "Use this only if your auth library exposes the returned ID token but does not validate/map it for you. Call it on the server.",
        code: `import { verifySsoIdToken } from "@skycanvasstudio/sso/server"

const identity = await verifySsoIdToken({
  clientId: process.env.SSO_CLIENT_ID!,
  idToken: tokens.id_token,
  nonce: expectedNonce,
})

identity.user // { id, name, email, emailVerified, image }`,
      },
      {
        filename: "Register and test the callback",
        description: "Inspect the redirect_uri produced by your auth library and register that exact URL. Keep using that library for sessions, hooks, and logout.",
        code: `SSO_CLIENT_ID=your_skycanvas_client_id

# Example only — copy the exact redirect_uri from your authorization request:
https://your-domain.example/your-auth-library/callback/skycanvas`,
      },
    ],
  },

  manual: {
    label: "Use SSO without an auth library",
    shortLabel: "No auth library",
    description:
      "Choose this when the application has no auth system. Register {APP_URL}/auth/callback, not the Better Auth callback. The server helper owns OAuth, encrypted cookies, and the local session; the optional browser and React entries consume those local routes.",
    callbackPath: "/auth/callback",
    samples: [
      {
        filename: "Install",
        description: "React is needed only when you use the optional /react entry point.",
        code: `bun add @skycanvasstudio/sso

# Optional, for React hooks:
bun add react`,
      },
      {
        filename: "Server environment",
        description: "APP_URL is the public origin that receives the callback. SESSION_SECRET must contain at least 32 characters.",
        code: `SSO_CLIENT_ID=your_skycanvas_client_id
APP_URL=http://localhost:3000
SESSION_SECRET=replace_with_at_least_32_random_characters`,
      },
      {
        filename: "Create the server",
        description: "This uses standard Web Request and Response objects, so it can be mounted in any JavaScript server or full-stack framework.",
        code: `import { createSsoServer } from "@skycanvasstudio/sso/server"

export const sso = createSsoServer({
  clientId: process.env.SSO_CLIENT_ID!,
  appUrl: process.env.APP_URL!,
  sessionSecret: process.env.SESSION_SECRET!,
  // redirectOrigin: "https://frontend.example", // separate frontend only
  // trustedOrigins: ["https://frontend.example"],
})

console.log(sso.callbackUrl) // register this exact URL`,
      },
      {
        filename: "Mount the four routes",
        description: "Forward the incoming Web Request to sso.handle. Adapt your framework's request only if it does not use the Web standard.",
        code: `GET  /auth/login
GET  /auth/callback
GET  /auth/profile
POST /auth/logout

// In a catch-all route, or in each route:
return sso.handle(request)

// Individual handlers are also available:
// sso.login(request), sso.callback(request),
// sso.profile(request), sso.logout(request), sso.getSession(request)`,
      },
      {
        filename: "Browser client",
        description: "Browser code talks only to your local routes. For a separate frontend, set baseUrl to the backend origin and configure credentialed CORS.",
        code: `import { createSsoClient } from "@skycanvasstudio/sso/client"

export const ssoClient = createSsoClient({
  // baseUrl: "https://api.example.com",
})

ssoClient.login("/dashboard")
const session = await ssoClient.getSession()
await ssoClient.logout()`,
      },
      {
        filename: "Optional React hooks and UI",
        description: "Wrap the application once, import the packaged styles, and use the ready-made controls or the hooks for custom UI.",
        code: `import "@skycanvasstudio/sso/styles.css"
import { SsoProvider, SsoSignInButton, SsoUserMenu, useSsoSession } from "@skycanvasstudio/sso/react"
import { ssoClient } from "./sso-client"

<SsoProvider client={ssoClient}>{children}</SsoProvider>

const { status } = useSsoSession()
return status === "authenticated"
  ? <SsoUserMenu items={[{ label: "Dashboard", href: "/dashboard" }]} />
  : <SsoSignInButton callbackURL="/dashboard" />`,
      },
      {
        filename: "Register the callback URL",
        description: "Register the callback on the server origin, then test login, session restoration, protected routes, and logout.",
        code: `http://localhost:3000/auth/callback
https://your-domain.example/auth/callback`,
      },
    ],
  },

  language: {
    label: "Use SSO from another language",
    shortLabel: "Non-JavaScript backend",
    description:
      "The npm package is not required outside JavaScript. Configure a maintained OAuth 2.0/OpenID Connect library in your backend with the protocol values below, and let that backend own the callback and local session.",
    callbackPath: null,
    samples: [
      {
        title: "Choose a language-specific or universal agent guide",
        tabLabel: "Laravel",
        filename: "skycanvas-sso-laravel-agent-guide.md",
        description: "Select a tab and copy its complete Markdown guide into your project or coding-agent task. Use Other / Universal for any backend not listed here.",
        code: `# Add SkyCanvas SSO to a Laravel application

Use a maintained Laravel/PHP OAuth 2.0 or OpenID Connect client that supports
Authorization Code, PKCE S256, state, nonce, and JWKS JWT verification. Do not
implement JWT verification or OAuth cryptography manually.

## Configuration

Add SSO_CLIENT_ID, SSO_BASE_URL, APP_URL, and a strong Laravel APP_KEY. Derive:
- authorize: {SSO_BASE_URL}/api/auth/oauth2/authorize
- token: {SSO_BASE_URL}/api/auth/oauth2/token
- jwks: {SSO_BASE_URL}/api/auth/jwks
- scope: openid
- callback: {APP_URL}/auth/callback

## Implementation

1. Add GET /auth/login. Generate state, nonce, and a PKCE verifier; store them
   in Laravel's server-side session with a creation time. Redirect with
   response_type=code, client_id, redirect_uri, scope=openid, state, nonce,
   code_challenge, and code_challenge_method=S256.
2. Add GET /auth/callback. Reject OAuth errors, missing/expired flow state, or
   state mismatch. Exchange the code from the backend using the original
   redirect_uri and code_verifier.
3. Verify the ID token with the JWKS. Require the expected issuer, audience,
   expiry, nonce, and subject. Require matching ID/access-token subjects when
   the library exposes both. Map the verified claims to a local user.
4. Regenerate the Laravel session ID, create the local login session, erase the
   one-time OAuth flow values, and redirect only to a validated local path.
5. Add POST /auth/logout with CSRF protection. Clear the local session; for
   global logout, redirect to {SSO_BASE_URL}/api/auth/global-sign-out with a
   validated returnTo URL.

Register the exact callback URL in the SkyCanvas dashboard. Keep tokens and the
PKCE verifier server-side, and test new user, returning user, rejection,
expired state, tampered nonce, logout, and protected-route behavior.`,
        alternatives: [
          {
            tabLabel: "PHP",
            filename: "skycanvas-sso-php-agent-guide.md",
            code: `# Add SkyCanvas SSO to a PHP application

Use a maintained OAuth/OIDC client library with Authorization Code, PKCE S256,
state, nonce, and JWKS JWT verification. Configure SSO_CLIENT_ID, SSO_BASE_URL,
APP_URL, and a strong application-session secret. The callback is
{APP_URL}/auth/callback and the scope is openid.

Create GET /auth/login, GET /auth/callback, GET /auth/profile, and CSRF-protected
POST /auth/logout. At login, generate state, nonce, and a PKCE verifier with a
cryptographically secure RNG and keep them in a short-lived server session. At
callback, compare state in constant time, exchange the code server-side with
the original verifier, and verify the ID-token signature using
{SSO_BASE_URL}/api/auth/jwks. Require issuer, client audience, expiry, nonce,
subject, and required user claims before creating a rotated local session.

Use {SSO_BASE_URL}/api/auth/oauth2/authorize and
{SSO_BASE_URL}/api/auth/oauth2/token. Never expose tokens to browser JavaScript,
never accept an arbitrary post-login URL, and never write custom JWT crypto.
Register the exact callback in SkyCanvas and test failure paths as well as login.`,
          },
          {
            tabLabel: "FastAPI",
            filename: "skycanvas-sso-fastapi-agent-guide.md",
            code: `# Add SkyCanvas SSO to a FastAPI application

Use Authlib (or another maintained OIDC client) and Starlette session middleware
backed by a strong secret or server-side session store. Configure SSO_CLIENT_ID,
SSO_BASE_URL, APP_URL, and callback {APP_URL}/auth/callback.

Implement GET /auth/login and GET /auth/callback as async routes. Login must
generate and store state, nonce, and a PKCE verifier, then redirect to
{SSO_BASE_URL}/api/auth/oauth2/authorize with scope=openid and PKCE S256.
Callback must reject errors and stale/mismatched state, exchange the code at
{SSO_BASE_URL}/api/auth/oauth2/token using the original verifier, then validate
the ID token against {SSO_BASE_URL}/api/auth/jwks. Require issuer, audience,
expiry, nonce, and subject before rotating the local session and storing only
the local identity.

Add GET /auth/profile and CSRF-protected POST /auth/logout. Keep OAuth tokens
server-side, allow only local return paths, register the exact callback in
SkyCanvas, and cover success, replay, state, nonce, expiry, and logout tests.`,
          },
          {
            tabLabel: "Django",
            filename: "skycanvas-sso-django-agent-guide.md",
            code: `# Add SkyCanvas SSO to a Django application

Use a maintained Django OIDC integration or Authlib; confirm it supports PKCE
S256 and nonce validation. Configure SSO_CLIENT_ID, SSO_BASE_URL, APP_URL, and
callback {APP_URL}/auth/callback in Django settings. Use Django's server-side
session framework and CSRF middleware.

Add named login, callback, profile, and logout URL patterns. Login generates
state, nonce, and a PKCE verifier and stores them with a timestamp in the
session. Callback rejects OAuth errors and invalid/expired state, exchanges the
code server-side, and verifies the ID token via
{SSO_BASE_URL}/api/auth/jwks—including issuer, audience, expiry, nonce, and
subject—before mapping the identity to a Django user and rotating the session.

Use the /api/auth/oauth2/authorize and /api/auth/oauth2/token endpoints under
SSO_BASE_URL with scope openid. Logout must be POST + CSRF protected. Never put
tokens in browser storage or accept an external next URL. Register and test the
exact callback URI in SkyCanvas.`,
          },
          {
            tabLabel: "Python",
            filename: "skycanvas-sso-python-agent-guide.md",
            code: `# Add SkyCanvas SSO to a Python web application

Choose a maintained OAuth/OIDC client such as Authlib and integrate it through
your framework's request and session APIs. Require Authorization Code, PKCE
S256, state, nonce, and JWKS verification. Configure SSO_CLIENT_ID,
SSO_BASE_URL, APP_URL, and an application-session secret.

Implement /auth/login, /auth/callback, /auth/profile, and POST /auth/logout.
Store state, nonce, PKCE verifier, flow time, and a local return path in a
short-lived server-side or authenticated encrypted session. Exchange the code
only on the backend. Verify the ID token using
{SSO_BASE_URL}/api/auth/jwks and require issuer, audience, expiry, nonce, and
subject before creating a rotated local session.

Authorization endpoint: {SSO_BASE_URL}/api/auth/oauth2/authorize
Token endpoint: {SSO_BASE_URL}/api/auth/oauth2/token
Scope: openid

Keep tokens out of browser storage, protect logout against CSRF, allow only
local return paths, register the exact callback, and test both success and
security failure cases.`,
          },
          {
            tabLabel: "Other / Universal",
            filename: "skycanvas-sso-universal-agent-guide.md",
            code: `# Universal SkyCanvas SSO implementation guide

Use this guide for any backend language. Do not install the npm package. Select
a maintained OAuth 2.0/OpenID Connect library that supports Authorization Code,
PKCE S256, state, nonce, and asymmetric JWT verification through JWKS.

## Required configuration

SSO_CLIENT_ID, SSO_BASE_URL, APP_URL, a strong local-session secret, and one
exact callback URI. Use scope openid and these endpoints:
- {SSO_BASE_URL}/api/auth/oauth2/authorize
- {SSO_BASE_URL}/api/auth/oauth2/token
- {SSO_BASE_URL}/api/auth/jwks
- {SSO_BASE_URL}/api/oauth/client-metadata?client_id={SSO_CLIENT_ID}
- {SSO_BASE_URL}/api/auth/global-sign-out

## Required handlers

- GET /auth/login: create cryptographically random state, nonce, and PKCE
  verifier; store them with creation time and a safe local return path; redirect
  with response_type=code, client_id, exact redirect_uri, scope=openid, state,
  nonce, code_challenge, and code_challenge_method=S256.
- GET /auth/callback: reject provider errors, missing data, expired state, state
  mismatch, and replay; exchange code server-side with grant_type=
  authorization_code, client_id, the identical redirect_uri, and code_verifier.
- GET /auth/profile: return only the local session identity or 401.
- POST /auth/logout: require CSRF/origin protection, destroy the local session,
  and optionally redirect through global-sign-out using an allowlisted return URL.

## Token and session requirements

Verify the ID-token signature using JWKS and an allowed algorithm. Validate the
exact issuer learned from trusted metadata/configuration, audience containing
SSO_CLIENT_ID, expiry/not-before, nonce, and subject. Validate required identity
claims and token-subject consistency. Cache JWKS briefly and refresh once for an
unknown key ID. Never trust decoded-but-unverified claims.

Create an application-owned session only after verification. Rotate its ID,
use Secure + HttpOnly + SameSite cookies, enforce idle/absolute expiry, keep
OAuth tokens out of URLs/browser storage, consume flow state once, and allow
only relative post-login paths.

Register the exact redirect_uri in SkyCanvas. Test new and returning users,
cancelled login, invalid/replayed state, wrong nonce/audience/issuer, expired
tokens, unknown signing key, safe redirects, CSRF-resistant logout, and session
expiry.`,
          },
        ],
      },
    ],
  },
};
