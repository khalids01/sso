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
      "Choose this only when Better Auth owns your users and sessions. Register {BETTER_AUTH_URL}/api/auth/oauth2/callback/skycanvas. The adapter supplies the SkyCanvas OAuth configuration; Better Auth keeps owning callbacks, cookies, accounts, client hooks, and logout.",
    callbackPath: "/api/auth/oauth2/callback/skycanvas",
    samples: [
      {
        filename: "Install",
        description: "Install both packages in the project that contains your Better Auth server configuration.",
        code: `bun add @skycanvasstudio/sso better-auth`,
      },
      {
        filename: "Server environment",
        description: "Keep these values on the server. Use the public URL of the server that mounts Better Auth.",
        code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_at_least_32_random_characters
SSO_CLIENT_ID=your_skycanvas_client_id`,
      },
      {
        filename: "Add the provider to Better Auth",
        description: "Merge this plugin into your existing Better Auth instance. Preserve its database, plugins, and other sign-in methods.",
        code: `import { createSsoBetterAuthProvider } from "@skycanvasstudio/sso"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"

const skycanvas = createSsoBetterAuthProvider({
  clientId: process.env.SSO_CLIENT_ID!,
  baseUrl: process.env.SSO_URL, // optional
  forceLogin: true, // default; set false only for intentional silent SSO
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
        filename: "Keep your normal Better Auth route",
        description: "Mount auth.handler using Better Auth's normal instructions for your server. Do not add a second SkyCanvas callback handler.",
        code: `// Your existing catch-all auth route must forward both GET and POST.
export const GET = (request: Request) => auth.handler(request)
export const POST = (request: Request) => auth.handler(request)`,
      },
      {
        filename: "Create the browser client",
        description: "Wrap Better Auth once. The package then owns sign-in, account switching, and local/global logout navigation.",
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
})

// On the server, keep using auth.api.getSession({ headers }).`,
      },
      {
        filename: "Optional ready-made UI",
        description: "Import the stylesheet once. The menu shows read-only Profile first, custom items next, and Logout last. It follows shadcn theme variables and dark mode.",
        code: `import "@skycanvasstudio/sso/styles.css"
import { SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"
import { authClient, sso } from "./auth-client"

const { data } = authClient.useSession()

return data?.user ? (
  <SsoUserMenu
    user={data.user}
    items={[{ label: "Dashboard", href: "/dashboard" }]}
    showSwitchAccount
    onSwitchAccount={() => sso.switchAccount("/dashboard")}
    onLogout={() => sso.signOut({ global: true, returnTo: "/" })}
  />
) : (
  <SsoSignInButton onSignIn={() => sso.signIn("/dashboard")} />
)`,
      },
      {
        filename: "Register the callback URL",
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
        filename: "Use your language's OAuth/OIDC library",
        description: "Select a library that supports Authorization Code, PKCE S256, state, nonce, and JWT verification. Do not reimplement cryptography.",
        code: `SSO_CLIENT_ID=your_skycanvas_client_id
SSO_BASE_URL=https://api-sso.skycanvasstudio.com`,
      },
      {
        filename: "Provider endpoints",
        description: "Configure these exact endpoints in your library.",
        code: `Authorization: https://api-sso.skycanvasstudio.com/api/auth/oauth2/authorize
Token:         https://api-sso.skycanvasstudio.com/api/auth/oauth2/token
JWKS:          https://api-sso.skycanvasstudio.com/api/auth/jwks
Metadata:      https://api-sso.skycanvasstudio.com/api/oauth/client-metadata?client_id=YOUR_CLIENT_ID
Scope:         openid`,
      },
      {
        filename: "Authorization request",
        description: "Generate state, nonce, and a PKCE verifier on the backend. Store them in a short-lived server-side or encrypted HttpOnly flow session.",
        code: `response_type=code
client_id=YOUR_CLIENT_ID
redirect_uri=YOUR_EXACT_CALLBACK
scope=openid
state=RANDOM_VALUE
nonce=RANDOM_VALUE
code_challenge_method=S256
code_challenge=BASE64URL_SHA256_VERIFIER`,
      },
      {
        filename: "Token exchange and validation",
        description: "Exchange the code on the backend, then validate every item below before creating your local session.",
        code: `POST /api/auth/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
client_id=YOUR_CLIENT_ID
redirect_uri=YOUR_EXACT_CALLBACK
code=RETURNED_CODE
code_verifier=ORIGINAL_VERIFIER

Validate: state, flow age, signature, issuer, audience, expiry,
nonce, required claims, and matching access/ID-token subjects.`,
      },
      {
        filename: "Local session and browser contract",
        description: "Create your own secure application session. The browser should receive user/session data, never OAuth tokens.",
        code: `GET  /auth/login     -> redirect to SSO
GET  /auth/callback  -> validate and create local session
GET  /auth/profile   -> local user/session or 401
POST /auth/logout    -> clear local session

Register the exact redirect_uri generated by your backend library.`,
      },
    ],
  },
};
