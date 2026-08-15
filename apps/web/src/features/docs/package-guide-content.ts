import type { CodeSample } from "./integration-guide-content";

export type GuideMode = "react" | "better" | "other" | "manual" | "language";

export type PackageRecipe = {
  label: string;
  shortLabel: string;
  description: string;
  callbackPath: string | null;
  samples: CodeSample[];
};

const clerkLikeManualRecipe: Pick<PackageRecipe, "description" | "samples"> = {
  description:
    "Recommended for new TypeScript applications. Install one package; Better Auth stays private inside New SSO. Embedded mode renders packaged sign-in/sign-up forms in your app, while hosted mode redirects to the SSO page. Social OAuth uses a popup and does not require another Google callback or JavaScript origin.",
  samples: [
    {
      title: "Install one package",
      filename: "Terminal",
      description: "No Better Auth package, auth database, or consumer-side OAuth plugin is required.",
      code: `bun add @skycanvasstudio/sso`,
    },
    {
      title: "Server environment (required)",
      filename: ".env — server only",
      description: "Put these values in your server-only environment module. APP_URL is the public origin of this app and prevents a container, proxy, or server bound to 0.0.0.0 from generating an invalid callback. SKYCANVAS_SECRET_KEY must never reach browser code.",
      code: `# Server only — do not prefix these with VITE_ or NEXT_PUBLIC_
SKYCANVAS_PUBLISHABLE_KEY=your_client_id
SKYCANVAS_SECRET_KEY=replace_with_at_least_32_random_characters
SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com
APP_URL=http://localhost:3000`,
    },
    {
      title: "Client environment (not needed)",
      filename: "No client .env entry",
      description: "The packaged UI gets its safe configuration from the server bootstrap and local auth routes. Do not create VITE_SKYCANVAS_* or NEXT_PUBLIC_SKYCANVAS_* variables—not even for the publishable key.",
      code: `No browser environment variables are required.`,
    },
    {
      title: "Configure SkyCanvas once",
      tabLabel: "TanStack Start",
      filename: "src/lib/skycanvas.server.ts",
      description: "Choose embedded forms or the hosted page here. Popup is recommended for social OAuth; redirect remains available. The SDK provides an immediate popup loading screen while it prepares and opens SkyCanvas, so no application popup route is needed.",
      code: `import { createTanStackSso } from "@skycanvasstudio/sso/tanstack-start"
import { env } from "./env.server"

export const skycanvas = createTanStackSso({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
  appUrl: env.APP_URL,
  interactionMode: "embedded", // "hosted" redirects to the SSO auth page
  oauthMode: "popup",          // or "redirect"
})`,
      alternatives: [
        {
          tabLabel: "Next.js",
          filename: "src/lib/skycanvas.ts",
          code: `import { createNextSso } from "@skycanvasstudio/sso/next"
import { env } from "./env.server"

export const skycanvas = createNextSso({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
  appUrl: env.APP_URL,
  interactionMode: "embedded",
  oauthMode: "popup",
})`,
        },
      ],
    },
    {
      title: "Add one middleware",
      tabLabel: "TanStack Start",
      filename: "src/start.ts",
      description: "It mounts the package auth routes and makes the verified session available as context.skycanvasAuth.",
      code: `import { createServerOnlyFn, createStart } from "@tanstack/react-start"
import { createTanStackSsoMiddleware } from "@skycanvasstudio/sso/tanstack-start"

const loadSkycanvas = createServerOnlyFn(
  () => import("./lib/skycanvas.server").then(({ skycanvas }) => skycanvas),
)
const skycanvasMiddleware = createTanStackSsoMiddleware(
  loadSkycanvas,
)

export const startInstance = createStart(() => ({
  requestMiddleware: [skycanvasMiddleware],
}))`,
      alternatives: [
        {
          tabLabel: "Next.js",
          filename: "app/auth/[...sso]/route.ts",
          code: `import { skycanvas } from "@/lib/skycanvas"

export const { GET, POST, OPTIONS } = skycanvas.handlers`,
        },
      ],
    },
    {
      title: "Use the packaged UI anywhere",
      filename: "src/routes/login.tsx",
      description: "SignIn, SignUp, SsoAuth, and SsoAuthDialog automatically show only enabled methods. After successful password or popup OAuth authentication, returnTo safely navigates the original window. Provide onSuccess when your app should control navigation itself.",
      code: `import "@skycanvasstudio/sso/styles.css"
import { SignIn, SkyCanvasProvider } from "@skycanvasstudio/sso/react"

export function LoginPage() {
  return (
    <SkyCanvasProvider>
      <SignIn returnTo="/dashboard" />
    </SkyCanvasProvider>
  )
}`,
    },
    {
      title: "Protect server data",
      tabLabel: "TanStack Start",
      filename: "src/routes/protected.tsx",
      description: "UI components improve navigation, but authorization must be enforced where protected data is loaded.",
      code: `import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/protected")({
  beforeLoad: ({ context }) => {
    if (!context.skycanvasAuth.isAuthenticated) throw redirect({ to: "/login" })
  },
  component: ProtectedPage,
})`,
      alternatives: [
        {
          tabLabel: "Next.js",
          filename: "app/protected/page.tsx",
          code: `import { redirect } from "next/navigation"
import { skycanvas } from "@/lib/skycanvas"

export default async function ProtectedPage() {
  const auth = await skycanvas.auth()
  if (!auth.isAuthenticated) redirect("/login")
  return <main>Signed in as {auth.session?.user.email}</main>
}`,
        },
      ],
    },
    {
      title: "Register the app once in SkyCanvas",
      filename: "SkyCanvas dashboard (not a project file)",
      description: "Add your app origin and callback in SkyCanvas. Do not add this callback—or each consumer domain—to Google, GitHub, Facebook, or LinkedIn; those providers keep pointing only to New SSO.",
      code: `Allowed origin: http://localhost:3000
Callback URL:  http://localhost:3000/auth/callback`,
    },
  ],
};

export const packageRecipes: Record<GuideMode, PackageRecipe> = {
  react: {
    label: "Use SSO in a React-only app",
    shortLabel: "React-only app",
    description:
      "The Clerk-like path for Vite and other client-rendered React apps. SkyCanvas hosts sign-in and owns OAuth provider callbacks, the central SSO session, code validation, and token issuance. Your app does not run an Elysia auth server.",
    callbackPath: "/auth/callback",
    samples: [
      {
        title: "Install",
        filename: "Terminal",
        description: "Add the React SDK. Its built-in auth forms include their own form dependency.",
        code: `bun add @skycanvasstudio/sso`,
      },
      {
        title: "Add public configuration",
        filename: ".env",
        description: "A publishable key identifies a public PKCE client; it is safe to include in a browser build and is not a secret.",
        code: `VITE_SKYCANVAS_PUBLISHABLE_KEY=your_client_id
VITE_SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com`,
      },
      {
        title: "Wrap the app once",
        filename: "src/main.tsx",
        description: "Popup is the default. On a social-provider click, the SDK immediately opens a small secure loading screen and navigates that same window to SkyCanvas—no popup route or loading component is required. Set oauthMode=\"redirect\" when top-level navigation is preferred. Your host must serve the SPA entry for /auth/callback as well as /.",
        code: `import { SkyCanvasProvider } from "@skycanvasstudio/sso/react"
import "@skycanvasstudio/sso/styles.css"

createRoot(document.getElementById("root")!).render(
  <SkyCanvasProvider
    publishableKey={import.meta.env.VITE_SKYCANVAS_PUBLISHABLE_KEY}
    ssoUrl={import.meta.env.VITE_SKYCANVAS_SSO_URL}
  >
    <App />
  </SkyCanvasProvider>,
)`,
      },
      {
        title: "Use Clerk-like components and hooks",
        filename: "src/App.tsx",
        description: "SignIn renders every method enabled for this application. Password and magic link stay embedded; clicking Google, GitHub, Facebook, or LinkedIn opens only that provider flow in a popup.",
        code: `import { SignIn, SignedIn, SignedOut, useAuth, useUser } from "@skycanvasstudio/sso/react"

export function App() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user } = useUser()

  async function loadOrders() {
    const token = await getToken()
    const response = await fetch("https://api.example.com/orders", {
      headers: token ? { authorization: "Bearer " + token } : {},
    })
    if (!response.ok) throw new Error("Could not load orders")
    return response.json()
  }

  return <>
    {!isLoaded ? <p>Loading session…</p> : null}
    <SignedOut><SignIn returnTo="/protected" /></SignedOut>
    <SignedIn>
      <p>{user?.email}</p>
      <button onClick={() => void loadOrders()}>Load protected data</button>
      <button onClick={() => void signOut()}>Sign out</button>
    </SignedIn>
  </>
}`,
      },
      {
        title: "Protect your application API",
        filename: "src/auth/skycanvas.server.ts",
        description: "Create one cached verifier per backend process, then verify the Bearer token returned by getToken(). No client secret or per-request SSO call is required.",
        code: `import { createSsoAccessTokenVerifier } from "@skycanvasstudio/sso/server"

export const skycanvas = createSsoAccessTokenVerifier({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
})

export async function requireSkyCanvasUser(request: Request) {
  const header = request.headers.get("authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) throw new Response("Unauthorized", { status: 401 })

  try {
    return await skycanvas.verify(token)
  } catch {
    throw new Response("Unauthorized", { status: 401 })
  }
}

// auth.subject is the stable pairwise user ID for this application.
// auth.claims contains only verified token claims.`,
      },
      {
        title: "Add the ready-made user menu and profile",
        filename: "src/components/account-menu.tsx",
        description: "SsoUserMenu opens the packaged UserProfile dialog. UserProfile can also render identical content directly in a page. OAuth avatars remain read-only; identity actions use short-lived app-scoped authorization and never expose mail or provider credentials.",
        code: `import { SsoUserMenu, UserProfile } from "@skycanvasstudio/sso/react"

export function AccountMenu() {
  return (
    <SsoUserMenu
      items={[{ label: "Dashboard", href: "/dashboard" }]}
      logoutReturnTo="/"
    />
  )
}

// The menu reads the signed-in user from <SkyCanvasProvider>.
// Click Profile in the menu to open the built-in Profile dialog.

export function ProfilePage() {
  return <UserProfile mode="content" />
}

export function ProfileButton() {
  return <UserProfile mode="dialog" label="Profile" />
}

// label accepts text, an icon, or both.
// additionalContent adds one minimal custom section.`,
      },
      {
        title: "Register the browser client",
        filename: "SkyCanvas dashboard (not a project file)",
        description: "Both URLs are exact. Enable the sign-in/sign-up methods that SignIn should render. Provider credentials such as Google continue to point only at central SkyCanvas.",
        code: `Allowed origin: http://localhost:5173
Callback URL:  http://localhost:5173/auth/callback

Sign-in methods: password, magic_link, google
Sign-up methods: password, magic_link, google
Registration:    open

# Only enabled and fully configured methods appear in <SignIn />.`,
      },
      {
        title: "Verify the complete flow",
        filename: "Acceptance checklist",
        description: "Do this before integrating real application data. UI-only route guards are not sufficient backend protection.",
        code: `✓ New user and returning user can sign in
✓ Popup and redirect modes return to /auth/callback
✓ Reload restores the short-lived session
✓ Protected API rejects missing, expired, and wrong-audience tokens
✓ getToken() authorizes the expected API request
✓ Local sign-out clears the app session
✓ Global sign-out returns only to a registered origin`,
      },
      {
        title: "Understand SPA loading",
        filename: "Rendering behavior",
        description: "A React-only app restores its session and public auth policy after the browser app starts. Keep a small isLoaded state in your page; the social popup transition itself is handled automatically by the SDK. Next.js and TanStack Start integrations can provide their initial session during SSR using the bootstrap steps in their guides, but OAuth navigation still has network latency in every framework.",
        code: `// React-only: client bootstrap
const { isLoaded } = useAuth()
if (!isLoaded) return <p>Loading session…</p>

// Next.js / TanStack Start: use the documented SSR bootstrap
// and pass it to <SsoProvider bootstrap={bootstrap}>.

// No custom popup loading page is needed in either mode.`,
      },
    ],
  },
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
        tabLabel: "TanStack Start",
        filename: ".env",
        description: "Keep the two SkyCanvas values beside your existing Better Auth server values. Do not create browser copies; the Better Auth client receives what it needs through its normal route.",
        code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_at_least_32_random_characters
SKYCANVAS_PUBLISHABLE_KEY=your_skycanvas_client_id
SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: ".env.local",
            code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_at_least_32_random_characters
SKYCANVAS_PUBLISHABLE_KEY=your_skycanvas_client_id
SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com`,
          },
        ],
      },
      {
        title: "Add the provider to Better Auth",
        filename: "src/lib/auth.ts",
        description: "Merge this plugin into your existing Better Auth instance. Preserve its database, plugins, and other sign-in methods. On TanStack Start, keep tanstackStartCookies() as the final plugin in the array.",
        code: `import { skycanvas } from "@skycanvasstudio/sso/better-auth"
import { betterAuth } from "better-auth"
import { env } from "./env.server"

export const skycanvasAuth = skycanvas({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
})

export const auth = betterAuth({
  // Keep your existing database and auth options.
  account: { encryptOAuthTokens: true },
  plugins: [
    // Keep your existing plugins here.
    skycanvasAuth,
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
        tabLabel: "TanStack Start",
        filename: "src/lib/auth-client.ts",
        description: "Add the matching client plugin to your existing Better Auth client. Keep using Better Auth's normal session hook and UI; no second provider or bootstrap layer is required.",
        code: `import { createAuthClient } from "better-auth/react"
import { skycanvasClient } from "@skycanvasstudio/sso/better-auth"

export const authClient = createAuthClient({
  plugins: [skycanvasClient()],
})

export function signInWithSkyCanvas(callbackURL = "/dashboard") {
  return authClient.signIn.oauth2({ providerId: "skycanvas", callbackURL })
}`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "src/lib/auth-client.ts",
            code: `"use client"

import { createAuthClient } from "better-auth/react"
import { skycanvasClient } from "@skycanvasstudio/sso/better-auth"

export const authClient = createAuthClient({
  plugins: [skycanvasClient()],
})

export function signInWithSkyCanvas(callbackURL = "/dashboard") {
  return authClient.signIn.oauth2({ providerId: "skycanvas", callbackURL })
}`,
          },
        ],
      },
      {
        title: "Create getInitialAuthSession",
        tabLabel: "TanStack Start",
        filename: "src/lib/auth-session.ts",
        description: "This application-owned server function lazily imports auth so TanStack never serializes it. The package returns only the session and safe public SSO configuration.",
        code: `import { createServerFn } from "@tanstack/react-start"
import { getTanStackBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getInitialAuthSession = createServerFn({ method: "GET" }).handler(
  () => getTanStackBetterAuthSsoBootstrap(async () => {
    const { auth, skycanvasAuth } = await import("./auth")
    return { auth, skycanvas: skycanvasAuth }
  }),
)`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "src/lib/auth-session.server.ts",
            code: `import "server-only"
import { getNextBetterAuthSsoBootstrap } from "@skycanvasstudio/sso/next"
import { auth, skycanvasAuth } from "@/lib/auth"

export async function getInitialAuthSession() {
  return getNextBetterAuthSsoBootstrap({ auth, skycanvas: skycanvasAuth })
}`,
          },
        ],
      },
      {
        title: "Wrap the app with the initial session",
        tabLabel: "TanStack Start",
        filename: "src/routes/__root.tsx (relevant part)",
        description: "Load the serializable bootstrap during SSR and mount the package-generated provider above every component that uses the SSO hooks. This avoids the client-only initial session flash; the SDK still supplies the immediate popup loading screen during social OAuth navigation.",
        code: `import { Outlet, createRootRoute } from "@tanstack/react-router"
import { SsoProvider } from "@/lib/auth-client"
import { getInitialAuthSession } from "@/lib/auth-session"

export const Route = createRootRoute({
  loader: async () => ({ bootstrap: await getInitialAuthSession() }),
  component: Root,
})

function Root() {
  const { bootstrap } = Route.useLoaderData()
  return (
    <SsoProvider bootstrap={bootstrap}>
      <Outlet />
    </SsoProvider>
  )
}`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "app/layout.tsx",
            code: `import { SsoProvider } from "@/lib/auth-client"
import { getInitialAuthSession } from "@/lib/auth-session.server"
import type { ReactNode } from "react"

export default async function RootLayout({ children }: { children: ReactNode }) {
  const bootstrap = await getInitialAuthSession()
  return (
    <html lang="en">
      <body>
        <SsoProvider bootstrap={bootstrap}>
          {children}
        </SsoProvider>
      </body>
    </html>
  )
}`,
          },
        ],
      },
      {
        title: "Use the correct user and session types",
        filename: "src/lib/auth-types.ts",
        description: "Better Auth owns the user and session shape on this path. Infer the exact types from your configured client so database fields and plugin extensions stay included. SkyCanvas types describe only SkyCanvas-owned contracts.",
        code: `import { authClient, useSso } from "@/lib/auth-client"

// Exact Better Auth types, including fields added by your config/plugins.
export type AuthSession = typeof authClient.$Infer.Session
export type AuthUser = AuthSession["user"]
export type SsoReactValue = ReturnType<typeof useSso>

// Example component props:
export type AccountMenuProps = {
  user: AuthUser
}

// SkyCanvas-owned types are available separately when needed:
export type {
  SsoUser,
  SsoSession,
  SsoClientMetadata,
  VerifiedSsoIdentity,
} from "@skycanvasstudio/sso/types"`,
      },
      {
        title: "Add the optional ready-made UI",
        filename: "src/components/account-menu.tsx (example)",
        description: "Import the stylesheet once. The menu shows read-only Profile first, custom items next, and Logout last. It follows shadcn theme variables and dark mode.",
        code: `import "@skycanvasstudio/sso/styles.css"
import { SsoSignInButton, SsoUserMenu } from "@skycanvasstudio/sso/react"
import { useSso } from "../lib/auth-client"

export function AccountMenu() {
  const { user, isPending, signIn, signOut } = useSso()

  if (isPending) return <span>Loading…</span>

  return user ? (
    <SsoUserMenu
      user={user}
      items={[{ label: "Dashboard", href: "/dashboard" }]}
      onLogout={() => signOut({ returnTo: "/" })}
    />
  ) : (
    <SsoSignInButton onSignIn={() => signIn("/dashboard")} />
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
    ].filter((sample) => new Set([
      "Install",
      "Configure the server environment",
      "Add the provider to Better Auth",
      "Create the browser client",
      "Register the callback URL",
    ]).has(sample.title ?? sample.filename)),
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
import { env } from "./env.server"

const sso = createSsoProvider({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
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
import { env } from "./env.server"

const identity = await verifySsoIdToken({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
  idToken: tokens.id_token,
  nonce: expectedNonce,
})

identity.user // { id, name, email, emailVerified, image }`,
      },
      {
        filename: "Register and test the callback",
        description: "Inspect the redirect_uri produced by your auth library and register that exact URL. Keep using that library for sessions, hooks, and logout.",
        code: `SKYCANVAS_PUBLISHABLE_KEY=your_skycanvas_client_id

# Example only — copy the exact redirect_uri from your authorization request:
https://your-domain.example/your-auth-library/callback/skycanvas`,
      },
    ],
  },

  manual: {
    label: "Use SSO in a full-stack TypeScript app",
    shortLabel: "Full-stack standalone",
    description:
      "Choose this when the application has no auth system. Register the application's /auth/callback URL, not the Better Auth callback. The SDK infers that URL from requests and owns OAuth, encrypted cookies, and the local session.",
    callbackPath: "/auth/callback",
    samples: [
      {
        title: "Install the published package",
        filename: "Terminal",
        description: "Install the npm package normally. React is required for the provider and ready-made controls shown below.",
        code: `bun add @skycanvasstudio/sso react`,
      },
      {
        title: "Configure the server environment",
        filename: ".env",
        description: "Only three values are required. The SDK infers the application origin and callback from each request.",
        code: `SKYCANVAS_PUBLISHABLE_KEY=your_skycanvas_client_id
SKYCANVAS_SECRET_KEY=replace_with_at_least_32_random_characters
SKYCANVAS_SSO_URL=https://api-sso.skycanvasstudio.com`,
      },
      {
        title: "Create one SSO server",
        filename: "src/lib/sso.server.ts",
        description: "This is the only place SSO configuration is supplied. Import explicit values from your validated server env module; never pass the whole environment object.",
        code: `import { createSsoServer } from "@skycanvasstudio/sso/server"
import { env } from "./env.server"

export const sso = createSsoServer({
  publishableKey: env.SKYCANVAS_PUBLISHABLE_KEY,
  secretKey: env.SKYCANVAS_SECRET_KEY,
  ssoUrl: env.SKYCANVAS_SSO_URL,
})
`,
      },
      {
        title: "Mount the SSO routes",
        tabLabel: "TanStack Start",
        filename: "src/server.ts",
        description: "Choose your framework. Mount the complete /auth/* handler so login, callback, session, UserProfile, and logout routes all reach the standalone helper.",
        code: `import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"
import { sso } from "./lib/sso.server"

const fetch = createStartHandler(async (context) => {
  const pathname = new URL(context.request.url).pathname

  if (pathname.startsWith("/auth/")) {
    return sso.handle(context.request)
  }

  return defaultStreamHandler(context)
})

export default { fetch }

// sso.handle owns:
// GET  /auth/login
// GET  /auth/callback
// GET  /auth/profile
// GET + POST /auth/user-profile
// POST /auth/logout`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "app/auth/[...sso]/route.ts",
            code: `import { sso } from "@/lib/sso.server"

export const GET = (request: Request) => sso.handle(request)
export const POST = (request: Request) => sso.handle(request)`,
          },
          {
            tabLabel: "Elysia",
            filename: "src/index.ts",
            code: `import { Elysia } from "elysia"
import { sso } from "./lib/sso.server"

new Elysia()
  .all("/auth/*", ({ request }) => sso.handle(request))
  .listen(3000)`,
          },
          {
            tabLabel: "Express",
            filename: "src/server.ts",
            code: `import express from "express"
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node"
import { sso } from "./lib/sso.server"

const app = express()
app.all("/auth/*splat", createNodeSsoHandler(sso))`,
          },
          {
            tabLabel: "NestJS",
            filename: "src/app.module.ts",
            code: `import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common"
import { createNodeSsoHandler } from "@skycanvasstudio/sso/node"
import { sso } from "./auth/sso.server"

@Module({})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(createNodeSsoHandler(sso))
      .forRoutes({ path: "auth/*splat", method: RequestMethod.ALL })
  }
}`,
          },
        ],
      },
      {
        title: "Load the initial session for SSR",
        tabLabel: "TanStack Start",
        filename: "src/lib/sso-session.ts",
        description: "Keep createServerFn in application source and lazily import sso.server. The helper returns a plain bootstrap with the session and browser route configuration.",
        code: `import { createServerFn } from "@tanstack/react-start"
import { getTanStackStandaloneSsoBootstrap } from "@skycanvasstudio/sso/tanstack-start"

export const getSsoBootstrap = createServerFn({ method: "GET" }).handler(
  () => getTanStackStandaloneSsoBootstrap(
    () => import("./sso.server").then(({ sso }) => sso),
  ),
)`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "src/lib/sso-session.server.ts",
            code: `import "server-only"
import { getNextStandaloneSsoBootstrap } from "@skycanvasstudio/sso/next"
import { sso } from "./sso.server"

export function getSsoBootstrap() {
  return getNextStandaloneSsoBootstrap({ sso })
}`,
          },
          {
            tabLabel: "Elysia",
            filename: "src/index.ts (session endpoint)",
            code: `import { sso } from "./lib/sso.server"

app.get("/api/sso/bootstrap", ({ request }) =>
  sso.getBootstrap(request),
)`,
          },
          {
            tabLabel: "Express",
            filename: "src/routes/session.ts",
            code: `import { nodeRequestHeaders } from "@skycanvasstudio/sso/node"
import { sso } from "../lib/sso.server"

app.get("/api/sso/bootstrap", async (request, response) => {
  response.json(await sso.getBootstrap(nodeRequestHeaders(request)))
})`,
          },
          {
            tabLabel: "NestJS",
            filename: "src/auth/sso.controller.ts",
            code: `import { Controller, Get, Req } from "@nestjs/common"
import { nodeRequestHeaders } from "@skycanvasstudio/sso/node"
import { sso } from "./sso.server"

@Controller("api/sso")
export class SsoController {
  @Get("bootstrap")
  getBootstrap(@Req() request: { headers: Record<string, string> }) {
    return sso.getBootstrap(nodeRequestHeaders(request))
  }
}`,
          },
        ],
      },
      {
        title: "Wrap the application with initial session data",
        tabLabel: "TanStack Start",
        filename: "src/routes/__root.tsx (relevant part)",
        description: "Load the bootstrap during SSR and pass it into SsoProvider once above the application. This avoids the client-only initial session flash; the SDK supplies the immediate popup loading screen during social OAuth navigation. The package controls read the session internally; do not import standalone session hooks.",
        code: `import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router"
import { SsoProvider } from "@skycanvasstudio/sso/react"
import { getSsoBootstrap } from "@/lib/sso-session"

export const Route = createRootRoute({
  loader: async () => ({ bootstrap: await getSsoBootstrap() }),
  component: RootDocument,
})

function RootDocument() {
  const { bootstrap } = Route.useLoaderData()

  return (
    <html lang="en">
      <body>
        <SsoProvider bootstrap={bootstrap}>
          <Outlet />
        </SsoProvider>
        <Scripts />
      </body>
    </html>
  )
}`,
        alternatives: [
          {
            tabLabel: "Next.js",
            filename: "app/layout.tsx",
            code: `import { SsoProvider } from "@skycanvasstudio/sso/react"
import { getSsoBootstrap } from "@/lib/sso-session.server"
import type { ReactNode } from "react"

export default async function RootLayout({ children }: { children: ReactNode }) {
  const bootstrap = await getSsoBootstrap()

  return (
    <html lang="en">
      <body>
        <SsoProvider bootstrap={bootstrap}>
          {children}
        </SsoProvider>
      </body>
    </html>
  )
}`,
          },
        ],
      },
      {
        title: "Use session, sign-in, profile, and logout",
        filename: "src/components/account-menu.tsx",
        description: "Components below the provider can use the standalone hooks and controls. UserProfile supports dialog and page-content modes; OAuth tokens remain sealed on the server and the OAuth avatar stays read-only.",
        code: `import { SsoSignInButton, SsoUserMenu, UserProfile } from "@skycanvasstudio/sso/react"

export function AccountMenu() {
  return <SsoUserMenu items={[{ label: "Dashboard", href: "/dashboard" }]} />
}

export function SignIn() {
  return <SsoSignInButton callbackURL="/dashboard" />
}

export function ProfilePage() {
  return <UserProfile mode="content" />
}

// Or: <UserProfile mode="dialog" label={<><UserIcon /> Profile</>} />
// Email actions show a warning when this application has no mail connection.
// Avatar upload and account deletion are intentionally not included.`,
      },
      {
        title: "Register the callback URL",
        filename: "SkyCanvas dashboard (not a project file)",
        description: "Register the callback on the server origin, then test login, session restoration, protected routes, and logout.",
        code: `http://localhost:3000/auth/callback
https://your-domain.example/auth/callback`,
      },
    ],
    ...clerkLikeManualRecipe,
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
