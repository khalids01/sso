# SSO Demo

`sso-demo` is a dark-mode TanStack Start reference application powered by
`@skycanvasstudio/sso`. It demonstrates the full server integration and the
optional React UI without reimplementing OAuth or session management in the app.

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

Set its generated client ID as `SSO_CLIENT_ID`. `BETTER_AUTH_URL` is the demo
origin, `BETTER_AUTH_SECRET` encrypts its local application session, and
`SSO_URL` points to the SSO API. The API must have
`ENABLE_OAUTH_TOKEN_ISSUANCE=true`, and its stable `SSO_ISSUER` must match the
issuer returned by client metadata.

The authenticated SSO user must also have an active membership in the
application owning `SSO_CLIENT_ID`. Central authentication alone is not enough
to issue an application-scoped token.

Run the SSO API, SSO web application, and demo from the repository root:

```bash
bun run dev
```

The demo is available at [http://localhost:5003](http://localhost:5003). For an
E2E-created client, the client ID can instead be supplied temporarily as
`/?client_id=...`; this small bridge exists only because the test provisions a
new client at runtime. Normal applications configure one `clientId` once.

## Security boundaries

- The library keeps PKCE verifier, state, and nonce in a short-lived encrypted
  HttpOnly cookie.
- The library exchanges the callback code and verifies access and ID tokens
  against SSO JWKS, including issuer, audience, subject, and nonce binding.
- OAuth tokens are never rendered, placed in URLs, or written to browser storage.
- The library session is encrypted, HttpOnly, `SameSite=Lax`, and cannot outlive
  the SSO token.
- Local logout, global logout, and forced account switching are library features.

## Browser test

The guarded Playwright suite provisions a run-owned application, client, and
membership. It registers `http://localhost:5003/auth/callback`, performs visible
password login and password signup without email verification, checks verified
claims and session persistence, and signs out. Signup identities are unique to
the run and removed during guarded cleanup.

```bash
bun e2e -- specs/sso-demo.spec.ts
```

Use the existing `tests/e2e/.env` safety configuration. No OAuth provider
credentials or provider access tokens are needed for this password-auth journey.
