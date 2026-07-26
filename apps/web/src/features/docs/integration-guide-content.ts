export type CodeSample = {
  filename: string;
  code: string;
};

export const reactNodeSamples: CodeSample[] = [
  {
    filename: ".env",
    code: `SSO_URL=https://api-sso.skycanvasstudio.com
SSO_CLIENT_ID=your_client_id
APP_URL=http://localhost:3000
SESSION_SECRET=replace_with_32_random_characters`,
  },
  {
    filename: "src/App.tsx",
    code: `const loginHref = "/auth/login?returnTo=/dashboard"

export function App() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch("/auth/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then(setUser)
  }, [])

  if (!user) {
    return <a href={loginHref}>Continue with SkyCanvas</a>
  }

  return (
    <header>
      <span>Signed in as {user.name}</span>
      <button
        onClick={async () => {
          await fetch("/auth/logout", { method: "POST" })
          setUser(null)
        }}
      >
        Sign out
      </button>
    </header>
  )
}`,
  },
  {
    filename: "src/auth.ts",
    code: `// /auth/login creates PKCE, state, and nonce, then responds:
// 303 Location: https://sso.example.com/api/auth/oauth2/authorize
//   ?client_id=your_client_id&redirect_uri=...&code_challenge=...
//
// The complete implementation is in sso-server.ts below.
app.get("/auth/login", startAuthorization)
app.get("/auth/callback", finishAuthorization)
app.get("/auth/profile", requireSession, ({ user }) => Response.json(user))
app.post("/auth/logout", destroySession)

// Configure your OAuth helper with these provider endpoints:
const provider = {
  authorizationEndpoint: \`\${env.SSO_URL}/api/auth/oauth2/authorize\`,
  tokenEndpoint: \`\${env.SSO_URL}/api/auth/oauth2/token\`,
  jwksUri: \`\${env.SSO_URL}/api/auth/jwks\`,
  redirectUri: \`\${env.APP_URL}/auth/callback\`,
}`,
  },
];

export const securityChecklist = [
  "Keep OAuth tokens on the server; never expose them to React.",
  "Use Authorization Code with PKCE, state, and nonce.",
  "Verify token signature, issuer, audience, expiry, and nonce.",
  "Store only an encrypted, HttpOnly, Secure application session cookie.",
  "Register exact callback URLs; never accept arbitrary redirect URLs.",
] as const;
