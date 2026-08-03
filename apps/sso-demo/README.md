# SSO Demo

`sso-demo` is a dark-mode TanStack Start reference application powered by
`@skycanvasstudio/sso`. It demonstrates the full server integration and the
optional React UI without reimplementing OAuth or session management in the app.

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

The integration uses:

- `createSsoServer` for login, callback handling, token verification, encrypted
  application sessions, profile responses, and local/global logout.
- `createSsoClient` and `SsoProvider` for browser session state.
- `SsoSignInButton` for login.
- `SsoUserMenu` for the read-only profile modal, custom menu items, account
  switching, and logout.
- `@skycanvasstudio/sso/styles.css`, which consumes the demo's shadcn color
  variables and stays compatible with its forced dark theme.

## Local configuration

Copy the environment example and generate a session secret:

```bash
cp apps/sso-demo/.env.example apps/sso-demo/.env
openssl rand -base64 32
```

Create an active public application client in the SSO admin with:

- Redirect URI: `http://localhost:5003/auth/callback`
- Allowed origin: `http://localhost:5003`
- Grant type: `authorization_code`
- Response type: `code`
- Scope: `openid`
- Token endpoint authentication: `none`
- PKCE method: `S256`

This demo uses `createSsoServer`, not Better Auth. Therefore its callback is
always `/auth/callback`. Do **not** use
`http://localhost:5003/api/auth/oauth2/callback/skycanvas`; that route belongs
only to applications where Better Auth owns the callback and session.

Set its generated client ID as `SSO_CLIENT_ID`. `APP_URL` is the demo origin,
`SESSION_SECRET` encrypts its local application session, and `SSO_URL` points
to the SSO API. All four values are required; this demo does not accept Better
Auth compatibility aliases because it uses the standalone package server. The API must have
`ENABLE_OAUTH_TOKEN_ISSUANCE=true`, and its stable `SSO_ISSUER` must match the
issuer returned by client metadata.

The authenticated SSO user must also have an active membership in the
application owning `SSO_CLIENT_ID`. Central authentication alone is not enough
to issue an application-scoped token.

Run the SSO API, SSO web application, and demo from the repository root:

```bash
bun run dev
```

The demo is available at [http://localhost:5003](http://localhost:5003). It uses
the single client configured by `SSO_CLIENT_ID`, exactly like a normal external
application.

## Security boundaries

- The library keeps PKCE verifier, state, and nonce in a short-lived encrypted
  HttpOnly cookie.
- The library exchanges the callback code and verifies access and ID tokens
  against SSO JWKS, including issuer, audience, subject, and nonce binding.
- OAuth tokens are never rendered, placed in URLs, or written to browser storage.
- The library session is encrypted, HttpOnly, `SameSite=Lax`, and cannot outlive
  the SSO token.
- Global logout and explicit local-only logout are library features.
