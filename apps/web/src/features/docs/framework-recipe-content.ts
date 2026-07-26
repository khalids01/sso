import type { CodeSample } from "./integration-guide-content";

export const betterAuthSamples: CodeSample[] = [
  {
    filename: "src/lib/auth.ts",
    code: `import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { genericOAuth } from "better-auth/plugins"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { prisma } from "./db"

const ssoUrl = process.env.SSO_URL!
const clientId = process.env.SSO_CLIENT_ID!
const jwks = createRemoteJWKSet(
  new URL("/api/auth/jwks", ssoUrl),
)

export const auth = betterAuth({
  account: { encryptOAuthTokens: true },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [
    genericOAuth({
      config: [{
        providerId: "skycanvas",
        clientId,
        authorizationUrl:
          \`\${ssoUrl}/api/auth/oauth2/authorize\`,
        tokenUrl:
          \`\${ssoUrl}/api/auth/oauth2/token\`,
        scopes: ["openid"],
        pkce: true,

        // Verify the ID token before Better Auth stores the user.
        getUserInfo: async (tokens) => {
          if (!tokens.idToken) return null

          const metadata = await fetch(
            \`\${ssoUrl}/api/oauth/client-metadata?client_id=\${clientId}\`,
          ).then((response) => response.json())

          const { payload } = await jwtVerify(
            tokens.idToken,
            jwks,
            {
              issuer: metadata.issuer,
              audience: clientId,
            },
          )
          if (!payload.sub || !payload.email || !payload.name) {
            return null
          }

          return {
            id: payload.sub,
            name: String(payload.name),
            email: String(payload.email),
            emailVerified: payload.email_verified === true,
            image:
              typeof payload.picture === "string"
                ? payload.picture
                : undefined,
          }
        },
      }],
    }),
  ],
})`,
  },
  {
    filename: "src/lib/auth-client.ts",
    code: `import { createAuthClient } from "better-auth/client"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const signInWithSso = () =>
  authClient.signIn.oauth2({
    providerId: "skycanvas",
    callbackURL: "/dashboard",
  })

export const {
  useSession,
  signOut,
} = authClient`,
  },
  {
    filename: "src/server.ts",
    code: `import { Elysia } from "elysia"
import { auth } from "./auth"

export const app = new Elysia()
  .all("/api/auth/*", ({ request }) =>
    auth.handler(request),
  )
  .listen(3000)

// Register this exact callback in SkyCanvas:
// http://localhost:3000/api/auth/oauth2/callback/skycanvas`,
  },
];

export const nextBetterAuthSamples: CodeSample[] = [
  {
    filename: "SkyCanvas dashboard · Redirect URIs",
    code: `# Better Auth Generic OAuth callback format:
{BETTER_AUTH_URL}/api/auth/oauth2/callback/{providerId}

# This guide uses providerId: "skycanvas"
# Register these exact values in the SkyCanvas client:
http://localhost:3000/api/auth/oauth2/callback/skycanvas
https://your-domain.example/api/auth/oauth2/callback/skycanvas

# Wrong for Better Auth Generic OAuth:
http://localhost:3000/api/auth/callback

# Do not add SSO_CALLBACK_URL.
# Better Auth generates and handles this callback itself.`,
  },
  {
    filename: ".env.local",
    code: `BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace_with_32_random_characters
SSO_URL=https://api-sso.skycanvasstudio.com
SSO_CLIENT_ID=your_client_id

# Do not add SSO_CALLBACK_URL. Better Auth generates the callback.`,
  },
  {
    filename: "src/lib/auth.ts",
    code: `import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { createRemoteJWKSet, jwtVerify } from "jose"

const ssoUrl = process.env.SSO_URL!
const clientId = process.env.SSO_CLIENT_ID!
const jwks = createRemoteJWKSet(
  new URL("/api/auth/jwks", ssoUrl),
)

export const auth = betterAuth({
  // Keep your existing database, email/password,
  // and social provider configuration here.
  account: { encryptOAuthTokens: true },
  plugins: [
    genericOAuth({
      config: [{
        providerId: "skycanvas",
        clientId,
        authorizationUrl:
          \`\${ssoUrl}/api/auth/oauth2/authorize\`,
        tokenUrl:
          \`\${ssoUrl}/api/auth/oauth2/token\`,
        scopes: ["openid"],
        pkce: true,
        getUserInfo: async (tokens) => {
          if (!tokens.idToken) return null

          const metadata = await fetch(
            \`\${ssoUrl}/api/oauth/client-metadata?client_id=\${clientId}\`,
          ).then((response) => response.json())

          const { payload } = await jwtVerify(
            tokens.idToken,
            jwks,
            {
              issuer: metadata.issuer,
              audience: clientId,
            },
          )
          if (!payload.sub || !payload.email || !payload.name) {
            return null
          }

          return {
            id: payload.sub,
            name: String(payload.name),
            email: String(payload.email),
            emailVerified: payload.email_verified === true,
            image:
              typeof payload.picture === "string"
                ? payload.picture
                : undefined,
          }
        },
      }],
    }),
  ],
})`,
  },
  {
    filename: "src/app/api/auth/[...all]/route.ts",
    code: `import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)`,
  },
  {
    filename: "src/lib/auth-client.ts",
    code: `import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const signInWithSso = () =>
  authClient.signIn.oauth2({
    providerId: "skycanvas",
    callbackURL: "/",
  })

export const { useSession, signOut } = authClient`,
  },
  {
    filename: "src/app/sign-in/sso-button.tsx",
    code: `"use client"

import { signInWithSso } from "@/lib/auth-client"

export function SsoButton() {
  return (
    <button type="button" onClick={signInWithSso}>
      Continue with SkyCanvas
    </button>
  )
}`,
  },
  {
    filename: "src/app/account/page.tsx",
    code: `import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) redirect("/sign-in")

  return <p>Signed in as {session.user.name}</p>
}`,
  },
];

export const manualSamples: CodeSample[] = [
  {
    filename: "src/server.ts",
    code: `import { Elysia } from "elysia"
import { ssoServer } from "./auth/sso-server"

export const app = new Elysia()
  .use(ssoServer)
  .get("/api/private", ({ ssoSession, status }) =>
    ssoSession
      ? { userId: ssoSession.user.id }
      : status(401, { error: "unauthorized" }),
  )
  .listen(3000)`,
  },
  {
    filename: "src/routes/account.tsx",
    code: `import { signIn } from "../auth/sso-client"
import { useSsoLogout, useSsoUser } from "../auth/sso-hooks"

export function AccountRoute() {
  const { user, isPending } = useSsoUser()
  const logout = useSsoLogout()

  if (isPending) return null
  if (!user) {
    return <button onClick={() => signIn()}>Sign in</button>
  }

  return (
    <>
      <p>{user.name}</p>
      <button onClick={() => logout.mutate()}>Sign out</button>
    </>
  )
}`,
  },
];
