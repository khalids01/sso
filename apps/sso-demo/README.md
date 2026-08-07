# SSO Demo

`sso-demo` is a dark-mode TanStack Start reference application powered by
`@skycanvasstudio/sso`. It demonstrates both supported consumer integrations:
Clerk-like standalone auth with packaged UI, and the optional Better Auth adapter.

This application intentionally installs `@skycanvasstudio/sso` from npm's
`latest` tag. It must never use the monorepo's `workspace:*` package or import
from `npm_package` source files. This keeps the demo representative of what an
external developer receives from the registry. The `predev` and `prebuild`
scripts update the dependency from npm and verify both its origin and version.
You can also run the checks explicitly:

```bash
bun run --cwd apps/sso-demo update:sso
bun run --cwd apps/sso-demo verify:published-package
```

The standalone route uses:

- `createTanStackSso` for callback handling, token verification, encrypted
  sessions, embedded password auth, and global logout.
- `SkyCanvasProvider` and the packaged `SignIn` form.
- `/standalone`, where password auth completes without leaving the demo origin.

The Better Auth route uses `createSsoBetterAuthIntegration`, Better Auth's
`genericOAuth` plugin, and the package's React adapter. Its login starts at
`/better-auth` and Better Auth owns the local application session.
- `@skycanvasstudio/sso/styles.css`, which consumes the demo's shadcn color
  variables and stays compatible with its forced dark theme.

## Local configuration

Copy the environment example and generate a session secret:

```bash
cp apps/sso-demo/.env.example apps/sso-demo/.env
openssl rand -base64 32
```

Create two active public application clients in the SSO admin. Both use the
demo origin as an allowed origin, `authorization_code`, `openid`, public client
authentication (`none`), and PKCE `S256`.

- Standalone redirect URI: `http://localhost:5003/auth/callback`
- Better Auth redirect URI:
  `http://localhost:5003/api/better-auth/oauth2/callback/skycanvas`

Set the generated IDs as `SSO_CLIENT_ID` and `BETTER_AUTH_SSO_CLIENT_ID`.
`APP_URL` is the demo origin, `SESSION_SECRET` protects both local sessions, and
`SSO_URL` points to the SSO API. The API must have
`ENABLE_OAUTH_TOKEN_ISSUANCE=true`, and its stable `SSO_ISSUER` must match the
issuer returned by client metadata.

For open-registration applications, the first successful authentication creates
the membership. Closed applications require an existing active membership.

Run the SSO API, SSO web application, and demo from the repository root:

```bash
bun run dev
```

The demo is available at [http://localhost:5003](http://localhost:5003).

## Security boundaries

- The library keeps PKCE verifier, state, and nonce in a short-lived encrypted
  HttpOnly cookie.
- The library exchanges the callback code and verifies access and ID tokens
  against SSO JWKS, including issuer, audience, subject, and nonce binding.
- OAuth tokens are never rendered, placed in URLs, or written to browser storage.
- The library session is encrypted, HttpOnly, `SameSite=Lax`, and cannot outlive
  the SSO token.
- Global logout and explicit local-only logout are library features.
