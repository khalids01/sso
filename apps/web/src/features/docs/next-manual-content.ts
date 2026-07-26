import type { CodeSample } from "./integration-guide-content";

export const nextManualSamples: CodeSample[] = [
  {
    filename: "src/auth/sso-next-server.ts",
    code: `import { createHash, randomBytes } from "node:crypto"
import {
  createRemoteJWKSet,
  EncryptJWT,
  jwtDecrypt,
  jwtVerify,
} from "jose"
import { type NextRequest, NextResponse } from "next/server"
import type { SsoSession, SsoUser } from "./sso-type"

const SSO_URL = required("SSO_URL")
const CLIENT_ID = required("SSO_CLIENT_ID")
const APP_URL = new URL(required("APP_URL")).origin
const CALLBACK_URL = \`\${APP_URL}/auth/callback\`
const key = createHash("sha256")
  .update(required("SESSION_SECRET"))
  .digest()
const jwks = createRemoteJWKSet(
  new URL("/api/auth/jwks", SSO_URL),
)

type Flow = {
  state: string
  nonce: string
  verifier: string
  returnTo: string
}

type Tokens = {
  access_token: string
  id_token: string
  expires_in: number
}

type Metadata = {
  issuer: string
  audience: string
}

export async function login(request: NextRequest) {
  const verifier = randomBytes(48).toString("base64url")
  const flow: Flow = {
    verifier,
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    returnTo: safeReturnTo(
      request.nextUrl.searchParams.get("returnTo"),
    ),
  }
  const challenge = createHash("sha256")
    .update(verifier)
    .digest("base64url")
  const authorize = new URL(
    "/api/auth/oauth2/authorize",
    SSO_URL,
  )
  authorize.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: "code",
    scope: "openid",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge_method: "S256",
    code_challenge: challenge,
  }).toString()

  const response = NextResponse.redirect(authorize, 303)
  response.cookies.set(
    "sso_flow",
    await seal(flow, 600),
    cookieOptions(600),
  )
  return response
}

export async function callback(request: NextRequest) {
  try {
    const flowToken = request.cookies.get("sso_flow")?.value
    if (!flowToken) throw new Error()
    const flow = await unseal<Flow>(flowToken)
    const code = request.nextUrl.searchParams.get("code")
    if (
      !code ||
      request.nextUrl.searchParams.get("state") !== flow.state
    ) {
      throw new Error()
    }

    const metadata = await getJson<Metadata>(
      new URL(
        \`/api/oauth/client-metadata?client_id=\${CLIENT_ID}\`,
        SSO_URL,
      ),
    )
    const tokens = await exchangeCode(code, flow.verifier)
    const [access, identity] = await Promise.all([
      jwtVerify(tokens.access_token, jwks, {
        issuer: metadata.issuer,
        audience: metadata.audience,
      }),
      jwtVerify(tokens.id_token, jwks, {
        issuer: metadata.issuer,
        audience: CLIENT_ID,
      }),
    ])
    if (access.payload.sub !== identity.payload.sub) {
      throw new Error()
    }
    if (identity.payload.nonce !== flow.nonce) {
      throw new Error()
    }

    const seconds = Math.min(tokens.expires_in, 10 * 60)
    const response = NextResponse.redirect(
      new URL(flow.returnTo, APP_URL),
      303,
    )
    response.cookies.set(
      "sso_session",
      await seal({ user: toUser(identity.payload) }, seconds),
      cookieOptions(seconds),
    )
    clearCookie(response, "sso_flow")
    return response
  } catch {
    const response = NextResponse.json(
      { error: "invalid_sso_callback" },
      { status: 400 },
    )
    clearCookie(response, "sso_flow")
    return response
  }
}

export async function profile(request: NextRequest) {
  const session = await readSsoSession(request)
  return session
    ? NextResponse.json(session, {
        headers: { "cache-control": "no-store" },
      })
    : NextResponse.json(
        { error: "unauthorized" },
        { status: 401 },
      )
}

export function logout(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && origin !== APP_URL) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403 },
    )
  }
  const response = new NextResponse(null, { status: 204 })
  clearCookie(response, "sso_session")
  return response
}

export async function readSsoSession(
  request: NextRequest,
): Promise<SsoSession | null> {
  try {
    const token = request.cookies.get("sso_session")?.value
    if (!token) return null
    const { payload } = await jwtDecrypt(token, key)
    if (!payload.exp || !payload.user) return null
    return {
      user: payload.user as SsoUser,
      expiresAt: payload.exp * 1000,
    }
  } catch {
    return null
  }
}

async function exchangeCode(code: string, verifier: string) {
  const response = await fetch(
    new URL("/api/auth/oauth2/token", SSO_URL),
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        redirect_uri: CALLBACK_URL,
        code,
        code_verifier: verifier,
      }),
    },
  )
  if (!response.ok) throw new Error()
  return response.json() as Promise<Tokens>
}

function toUser(claims: Record<string, unknown>): SsoUser {
  if (
    typeof claims.sub !== "string" ||
    typeof claims.name !== "string" ||
    typeof claims.email !== "string"
  ) {
    throw new Error()
  }
  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    image:
      typeof claims.picture === "string"
        ? claims.picture
        : null,
  }
}

async function seal(value: object, seconds: number) {
  return new EncryptJWT({ ...value })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(\`\${seconds}s\`)
    .encrypt(key)
}

async function unseal<T>(token: string): Promise<T> {
  return (await jwtDecrypt(token, key)).payload as T
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: APP_URL.startsWith("https:"),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

function clearCookie(
  response: NextResponse,
  name: string,
) {
  response.cookies.set(name, "", cookieOptions(0))
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error()
  return response.json() as Promise<T>
}

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/"
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(\`Missing \${name}\`)
  return value
}`,
  },
  {
    filename: "app/auth/login/route.ts",
    code: `export { login as GET } from "@/auth/sso-next-server"`,
  },
  {
    filename: "app/auth/callback/route.ts",
    code: `export { callback as GET } from "@/auth/sso-next-server"`,
  },
  {
    filename: "app/auth/profile/route.ts",
    code: `export { profile as GET } from "@/auth/sso-next-server"`,
  },
  {
    filename: "app/auth/logout/route.ts",
    code: `export { logout as POST } from "@/auth/sso-next-server"`,
  },
];
