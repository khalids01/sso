# Better Auth 1.6.23 Upgrade Audit

## Upgrade Boundary

- `better-auth` and `@better-auth/oauth-provider` are pinned to exactly
  `1.6.23` everywhere they are declared.
- `@better-auth/sso` is not installed and no `1.7` prerelease is used.
- Better Auth continues to own authorization request validation/signing,
  continuation, and authorization-code storage.
- SSO continues to own the token endpoint, code consumption, live-state
  revalidation, pairwise subjects, claims, signing policy, and JWKS lifecycle.

Dynamic registration, Better Auth's built-in token endpoint, session JWT,
refresh token, userinfo, introspection, revocation, discovery, and provider
client-management routes remain disabled.

## Release Compatibility Review

| Area | 1.6.23 review and retained SSO control |
| --- | --- |
| Continuation state | Signed continuation still passes through the SSO membership guard. Forged continuation coverage remains mandatory. |
| Prompt handling | The first protocol still rejects `prompt`; upstream prompt additions do not expand the supported surface. |
| Authorization-code storage | The 1.6.x `authTime` payload is accepted. A real browser compatibility test produces the code through Better Auth and consumes it through the SSO endpoint. |
| JWT signing | Better Auth stores and rotates encrypted RS256 keys, but SSO constructs the application-specific access and ID claims. Generic session JWT generation stays disabled. |
| Session lookup | Exchange revalidates the live database session and user after atomically burning the code. It does not trust only the code snapshot. |
| OAuth client privileges | The Prisma-backed application registry stays authoritative. Dynamic registration and client-management routes stay disabled. |
| Redirect derivation | Exact registered callback matching and exact submitted redirect binding remain SSO requirements. Request hosts never derive issuer or callback trust. |
| Rate limits | Existing global limits remain, with explicit token-exchange failure limits and tests. |

## Generated Schema Comparison

The 1.6.23 generator was run against the real auth configuration with output in
`/tmp`, outside the repository. It proposed optional dynamic-client fields and
OAuth access/refresh-token models used by disabled behavior. No enabled behavior
requires a database change, so this upgrade intentionally adds no migration and
does not add unused tables. Existing migrations remain unchanged.

## Resource Indicator Advisory

The dependency audit flags `GHSA-p2fr-6hmx-4528` for every stable 1.6.x version
of `@better-auth/oauth-provider`. The upstream issue allows Better Auth's token
endpoint to choose an access-token audience from an unbound RFC 8707 `resource`
parameter. The only upstream patch currently available is a forbidden 1.7
prerelease.

This SSO does not expose the affected behavior:

- Better Auth's token and refresh-token endpoints are disabled.
- The SSO token endpoint uses an allowlist of form fields and rejects `resource`
  or any other unsupported parameter before exchange.
- Authorization requests also reject `resource` explicitly.
- Access-token `aud` is always derived from the code-bound application ID.
- ID-token `aud` is always the code-bound client ID.
- Refresh tokens are never issued.
- Resource servers must continue exact audience verification and must not treat
  a client-provided resource indicator as an authorization boundary.

Regression tests cover authorization- and token-endpoint rejection. Upgrade to
the first patched stable Better Auth release when one is available; do not move
this project to a prerelease to silence the audit.

## Dependency Audit Result

`bun audit` was executed and is not clean. In addition to the mitigated OAuth
provider advisory above, it reports pre-existing direct and transitive findings
outside this upgrade's package boundary. Those findings require a separate,
reviewed dependency-remediation slice; they must not be represented as resolved
by this upgrade. Token issuance remains deployment-disabled and staging-gated.
