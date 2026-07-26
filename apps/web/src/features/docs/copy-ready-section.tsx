import { useState } from "react";
import { CopyCodeBlock } from "./copy-code-block";
import type { CodeSample } from "./integration-guide-content";

const files = {
  types: {
    filename: "src/auth/sso-type.d.ts",
    code: `export type SsoUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
}

export type SsoSession = {
  user: SsoUser
  expiresAt: number
}

export type SsoError = {
  error: string
}`,
  },
  client: {
    filename: "src/auth/sso-client.ts",
    code: `import type { SsoError, SsoSession } from "./sso-type"

export async function getSsoSession(): Promise<SsoSession | null> {
  const response = await fetch("/auth/profile", { credentials: "include" })
  if (response.status === 401) return null
  if (!response.ok) throw await toError(response)
  return response.json()
}

export function signIn(returnTo = window.location.pathname) {
  window.location.assign(
    \`/auth/login?returnTo=\${encodeURIComponent(returnTo)}\`,
  )
}

export async function signOut() {
  const response = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  })
  if (!response.ok) throw await toError(response)
}

async function toError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as SsoError | null
  return new Error(body?.error ?? "SSO request failed")
}`,
  },
  hooks: {
    filename: "src/auth/sso-hooks.ts",
    code: `import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { getSsoSession, signOut } from "./sso-client"

const sessionKey = ["sso", "session"] as const

export function useSsoSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: getSsoSession,
    staleTime: 60_000,
    retry: false,
  })
}

export function useSsoUser() {
  const session = useSsoSession()
  return { ...session, user: session.data?.user ?? null }
}

export function useSsoLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSuccess: () => queryClient.setQueryData(sessionKey, null),
  })
}`,
  },
  server: {
    filename: "src/auth/sso-server.ts",
    code: `import { createHash, randomBytes } from "node:crypto"
import { Elysia } from "elysia"
import {
  createRemoteJWKSet,
  EncryptJWT,
  jwtDecrypt,
  jwtVerify,
} from "jose"
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

export const ssoServer = new Elysia({ name: "sso-server" })
  .derive(async ({ request }) => ({
    ssoSession: await readSsoSession(request),
  }))
  .get("/auth/login", ({ request }) => startLogin(request))
  .get("/auth/callback", ({ request }) => finishLogin(request))
  .get("/auth/profile", ({ ssoSession, status }) =>
    ssoSession ?? status(401, { error: "unauthorized" }),
  )
  .post("/auth/logout", ({ request }) => logout(request))

async function startLogin(request: Request) {
  const url = new URL(request.url)
  const verifier = randomBytes(48).toString("base64url")
  const flow: Flow = {
    verifier,
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    returnTo: safeReturnTo(url.searchParams.get("returnTo")),
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

  return redirect(
    authorize,
    cookie("sso_flow", await seal(flow, 600), 600),
  )
}

async function finishLogin(request: Request) {
  try {
    const url = new URL(request.url)
    const flow = await unseal<Flow>(
      readCookie(request, "sso_flow"),
    )
    const code = url.searchParams.get("code")
    if (!code || url.searchParams.get("state") !== flow.state) {
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
    if (access.payload.sub !== identity.payload.sub) throw new Error()
    if (identity.payload.nonce !== flow.nonce) throw new Error()

    const seconds = Math.min(tokens.expires_in, 10 * 60)
    const session = cookie(
      "sso_session",
      await seal({ user: toUser(identity.payload) }, seconds),
      seconds,
    )
    return redirect(
      new URL(flow.returnTo, APP_URL),
      session,
      clear("sso_flow"),
    )
  } catch {
    return Response.json(
      { error: "invalid_sso_callback" },
      { status: 400 },
    )
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

export async function readSsoSession(
  request: Request,
): Promise<SsoSession | null> {
  try {
    const token = readCookie(request, "sso_session")
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

function logout(request: Request) {
  const origin = request.headers.get("origin")
  if (origin && origin !== APP_URL) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }
  return new Response(null, {
    status: 204,
    headers: { "set-cookie": clear("sso_session") },
  })
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
      typeof claims.picture === "string" ? claims.picture : null,
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

function cookie(name: string, value: string, maxAge: number) {
  const secure = APP_URL.startsWith("https:")
    ? "; Secure"
    : ""
  return [
    \`\${name}=\${value}\`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    \`Max-Age=\${maxAge}\${secure}\`,
  ].join("; ")
}

function clear(name: string) {
  return cookie(name, "", 0)
}

function readCookie(request: Request, name: string) {
  const value = request.headers
    .get("cookie")
    ?.split("; ")
    .find((part) => part.startsWith(\`\${name}=\`))
    ?.slice(name.length + 1)
  if (!value) throw new Error()
  return value
}

function redirect(url: URL, ...cookies: string[]) {
  const headers = new Headers({
    location: url.toString(),
    "cache-control": "no-store",
  })
  cookies.forEach((value) =>
    headers.append("set-cookie", value),
  )
  return new Response(null, { status: 303, headers })
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
} satisfies Record<string, CodeSample>;

type FileKey = keyof typeof files;

const labels: Record<FileKey, string> = {
  types: "Types",
  client: "Browser client",
  hooks: "React hooks",
  server: "Elysia server",
};

export function CopyReadySection() {
  const [file, setFile] = useState<FileKey>("types");

  return (
    <section
      id="copy-ready"
      className="scroll-mt-24 border-b border-[#292e42] py-14"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#7aa2f7]">
        Manual integration kit
      </p>
      <h2 className="text-[clamp(1.65rem,3vw,2rem)] font-semibold leading-tight tracking-[-0.025em] text-[#f4f6ff]">
        Four files you can copy
      </h2>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-[#7f849c]">
        No custom package and no UI. Install{" "}
        <PackageName>jose</PackageName> on the server and{" "}
        <PackageName>@tanstack/react-query</PackageName> in React.
      </p>

      <div
        className="mt-7 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Copy-ready files"
      >
        {(Object.keys(files) as FileKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={file === key}
            onClick={() => setFile(key)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
              file === key
                ? "border-[#7aa2f7]/50 bg-[#7aa2f7]/10 text-[#7aa2f7]"
                : "border-[#292e42] bg-[#111522] text-[#7f849c] hover:text-[#c0caf5]"
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>

      <div className="mt-5" role="tabpanel">
        <CopyCodeBlock sample={files[file]} />
      </div>

      <div className="mt-6 rounded-xl border border-[#7aa2f7]/25 bg-[#7aa2f7]/[0.07] p-4 text-sm leading-6 text-[#a9b1d6]">
        The server file owns PKCE, callback verification, profile,
        logout, and the encrypted local session. OAuth tokens never
        enter React or browser storage.
      </div>
    </section>
  );
}

function PackageName({ children }: { children: string }) {
  return (
    <code className="rounded border border-[#3b4261] bg-[#1a1b26] px-1.5 py-0.5 font-mono text-[0.78rem] text-[#7dcfff]">
      {children}
    </code>
  );
}
