# SSO Demo

`sso-demo` is a TanStack Start reference application for the SSO public-client
authorization-code flow. It uses shadcn-style UI primitives and is intentionally
small enough to serve as an integration example.

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

Set its generated client ID as `SSO_DEMO_CLIENT_ID`. The API must have
`ENABLE_OAUTH_TOKEN_ISSUANCE=true`, and its stable `SSO_ISSUER` must match the
issuer returned by client metadata.

Run the SSO API, SSO web application, and demo from the repository root:

```bash
bun run dev
```

The demo is available at [http://localhost:5003](http://localhost:5003). For an
E2E-created client, the client ID can instead be supplied temporarily as
`/?client_id=...`; it is used only to begin the server-side authorization flow.

## Security boundaries

- PKCE verifier, state, and nonce live in a short-lived encrypted HttpOnly cookie.
- The callback exchanges the code from the demo server, with the registered demo origin.
- Access and ID tokens are verified against SSO JWKS for signature, issuer,
  audience, subject, and nonce binding.
- OAuth tokens are not rendered, placed in URLs, or written to browser storage.
- The resulting application session is encrypted, HttpOnly, `SameSite=Lax`, and
  cannot outlive the ten-minute SSO token.
- Local sign-out clears only the demo session. Global SSO logout remains outside
  the current public-client protocol.

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
