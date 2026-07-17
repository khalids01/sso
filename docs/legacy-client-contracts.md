# Legacy Production SSO Contract Inventory

This inventory is derived from `old_prod_sso` source code only. It does not
identify which clients are active in production and does not authorize adding
legacy behavior to the new SSO.

## Browser protocol

| Area | Legacy contract | New SSO decision |
| --- | --- | --- |
| Login request | `/login?token=<client-token>&redirect_url=<url>` | Replace with OAuth authorization code, state, and PKCE. |
| Registration request | `/register` with the same query parameters | Do not add public password registration in this slice. |
| Callback | Appends `auth_token` or `social_token` to browser URLs | Return only `code` and `state` to an exact registered callback. |
| Redirect validation | Case-insensitive prefix matching | Require exact URI matching. |
| Origin validation | Exact or wildcard origin; missing origin can pass | Require the submitted client's exact registered browser origin. |
| Browser storage | Examples store JWTs in `localStorage` | Tokens must not enter frontend URLs or persistent browser storage. |

## Token and profile contract

- Tokens are HS-signed JWTs containing the global MongoDB `userId` and expire
  after 365 days.
- Client applications send the token as `Authorization: Bearer <token>` to the
  legacy profile endpoint.
- The profile response exposes `id`, `name`, `email`, `profileImageUrl`,
  `authProvider`, and `createdAt`.
- Logout is client-side token deletion; the documented flow has no authoritative
  server-side access-token revocation.

The new SSO intentionally replaces this with pairwise subjects, ten-minute
RS256 tokens, application audience binding, JWKS verification, and no refresh
token. Profile/userinfo compatibility must be justified by an active client
contract before an endpoint is added.

## Identity and social behavior

- Legacy users have one optional `clientId`, so the stored identity model is
  client-bound rather than a many-application membership model.
- Google and Facebook credentials are stored per client. Their provider
  callbacks terminate on the legacy app origin, then bounce through the login
  page with a JWT in the query string.
- Google accounts are matched by email or provider user ID. Facebook fabricates
  an email when the provider does not return one.
- Existing users can be changed to a different `authProvider` during social
  login. The new Google authentication slice must define account linking safely
  without importing that behavior.
- Password login, registration, forgot-password, and reset-password are all
  scoped by the client token and redirect URL.
- The legacy client-info route returns Google and Facebook client secrets to the
  browser. This behavior must never be reproduced.

## Direct application onboarding

Before integrating an application with the new SSO, obtain the following from
that application's owner without copying secrets into documentation:

- Application name and owner.
- Exact callback URIs and browser origins for the target environments.
- Current login methods and whether password reset or registration is used.
- Required profile fields, roles, scopes, and local session lifetime.
- Planned JWKS verification implementation.
- Required logout, ban, suspension, and revocation latency.
- Social providers and ownership of their provider credentials.
- Rollback owner, monitoring contact, and acceptable integration window.

This is an integration contract for the new application, not an inventory or
migration of old production SSO clients.
