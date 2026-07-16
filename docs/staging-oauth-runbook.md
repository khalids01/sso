# Staging OAuth Verification Runbook

Use this runbook only for an explicitly approved non-production environment.
The Playwright safety layer rejects known production origins, non-allowlisted
service hosts, and missing mutation acknowledgement.

## Deployment configuration

Configure the staging API with stable, exact values:

```env
BETTER_AUTH_URL=https://staging-api.example.com/api/auth
SSO_ISSUER=https://staging-api.example.com/api/auth
CORS_ORIGIN=https://staging-sso.example.com
ENABLE_OAUTH_TOKEN_ISSUANCE=false
ENABLE_APPLICATION_REVOCATION_DELIVERY=false
ALLOW_LOCAL_APPLICATION_WEBHOOKS=false
```

Before deployment, validate and generate Prisma locally. Confirm the target
database is the approved staging host and inspect migration status before
applying any migration. Confirm the application revocation migration is present;
never edit or roll back an existing migration.

Deploy with issuance disabled first and verify:

- `/api/auth/oauth2/token` returns `404`.
- Better Auth's generic `/api/auth/token` and built-in OAuth token endpoint stay
  disabled.
- `/api/auth/jwks` returns only public RS256 keys with five-minute cache headers.
- Web and API health checks resolve to the approved staging origins.

Then set `ENABLE_OAUTH_TOKEN_ISSUANCE=true` and
`ENABLE_APPLICATION_REVOCATION_DELIVERY=true` for the guarded verification
window. Keep `ALLOW_LOCAL_APPLICATION_WEBHOOKS=false`.

## Guarded E2E configuration

Create an untracked `tests/e2e/.env` using dedicated staging identities and
direct staging service connections:

```env
E2E_TARGET=staging
E2E_WEB_ORIGIN=https://staging-sso.example.com
E2E_API_ORIGIN=https://staging-api.example.com
E2E_CALLBACK_ORIGIN=https://e2e-callback.example.com
E2E_CALLBACK_LISTEN_PORT=5010
SSO_ISSUER=https://staging-api.example.com/api/auth
E2E_ALLOWED_WEB_ORIGINS=https://staging-sso.example.com
E2E_ALLOWED_API_ORIGINS=https://staging-api.example.com
E2E_ALLOWED_CALLBACK_ORIGINS=https://e2e-callback.example.com
E2E_KNOWN_PRODUCTION_ORIGINS=https://sso.example.com,https://api.example.com
E2E_DATABASE_URL=postgresql://<dedicated-staging-connection>
E2E_REDIS_URL=rediss://<dedicated-staging-connection>
E2E_ALLOWED_DATABASE_HOSTS=staging-db.example.com
E2E_ALLOWED_REDIS_HOSTS=staging-redis.example.com
E2E_CONFIRM_MUTATIONS=I_UNDERSTAND_E2E_MUTATES_DATA
```

Do not commit credentials or reuse personal/production owner accounts. Expose
the callback harness through an approved temporary HTTPS tunnel whose exact
public origin is `E2E_CALLBACK_ORIGIN` and whose local target is
`127.0.0.1:E2E_CALLBACK_LISTEN_PORT`. The origin must not be production and must
be explicitly allowlisted. This lets the browser receive the OAuth callback and
the staging API deliver the server-to-server revocation event without enabling
loopback/private webhook destinations.

Run both roles separately:

```bash
E2E_ACTOR_ROLE=admin bun e2e
E2E_ACTOR_ROLE=user bun e2e
```

Admin must pass application lifecycle, OAuth/JWKS verification, webhook
configuration, signed delivery, and idempotent local invalidation. User must pass
OAuth/JWKS verification while application management and webhook administration
remain forbidden. Confirm cleanup removed the run prefix and released the actor
lock after each run.

## Acceptance and rollback

Record the deployment version, migration status, issuer, origins, JWKS key IDs,
test run IDs, and admin/user results without recording codes or tokens. Issuance
is not production-ready until both staging roles pass.

Rollback is configuration-first:

1. Set `ENABLE_OAUTH_TOKEN_ISSUANCE=false` and
   `ENABLE_APPLICATION_REVOCATION_DELIVERY=false`, then redeploy/restart the API.
2. Confirm the SSO-owned token endpoint returns `404` and delivery attempts stop.
3. Leave the old production SSO authoritative and do not switch any client.
4. Preserve sanitized logs and test run IDs for diagnosis.

Do not delete signing keys or roll back an applied migration as an emergency
response. Retired public keys must remain available for their publication grace
period.
