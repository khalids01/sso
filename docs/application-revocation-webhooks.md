# Application Revocation Webhooks

Applications normally verify SSO access tokens locally through JWKS. They do
not call SSO on every request. Revocation webhooks close the short-token window
when access changes.

## Delivery contract

Configure one HTTPS endpoint per application in the SSO admin UI. SSO sends:

```http
POST /your/revocation/path
Content-Type: application/jwt
X-SSO-Event-ID: <event-jti>

<RS256 signed JWT>
```

The receiver must verify the JWT using `/api/auth/jwks` and require:

- the configured `SSO_ISSUER` as `iss`;
- `urn:sso:application:<applicationId>` as the exact `aud`;
- `RS256`, a valid published `kid`, and valid `iat`/`exp` values;
- `event_type=application.access.revoked`;
- the JWT `jti` to equal `X-SSO-Event-ID`.

Member events contain `reason`, pairwise `sub`, `application_id`,
`membership_id`, `authorization_version`, and `effective_at`. They never
contain the platform user ID, email, profile, roles, permissions, cookies, or
tokens. Application disable/archive events omit member identity and mean that
all local sessions for the application must be invalidated.

Supported reasons are `membership_suspended`, `membership_revoked`,
`user_banned`, `user_archived`, `application_disabled`, and
`application_archived`.

## Receiver behavior

Handle an event in one local database transaction:

1. Insert `jti` into a table with a unique constraint. If it already exists,
   return success without applying the event again.
2. For a member event, record the highest revoked authorization version for
   `sub` and delete every local session for that subject. Reject locally cached
   access with a version less than or equal to that revoked version.
3. For an application-wide event, invalidate every local application session
   and stop accepting access while the application is disabled or archived.
4. Commit, then return any `2xx` response.

Suspension/revocation and later restoration each increment the membership's
authorization version. Restoration does not revive old tokens; a new login
produces a token with a newer version.

Do not log the JWT body. Logging the event ID, application ID, reason, outcome,
and correlation data is sufficient.

## Retry behavior

SSO treats `2xx` as delivered. Network failures, `408`, `429`, and `5xx` retry
with bounded exponential backoff for up to 24 hours. Other `4xx` responses and
disabled or unsafe destinations are terminal. The event `jti` stays stable
across retries while each delivery receives a fresh five-minute signature.

Delivery uses database leases and `FOR UPDATE SKIP LOCKED`, so multiple API
instances cannot own the same attempt. Operators can inspect recent delivery
state and retry dead-lettered events from the application admin page.

## Destination policy

Deployed endpoints must use HTTPS and cannot contain URL credentials,
fragments, redirects, or private/reserved destinations. Loopback HTTP is
available only when `ALLOW_LOCAL_APPLICATION_WEBHOOKS=true`; production startup
rejects that setting.

The worker is disabled by default with
`ENABLE_APPLICATION_REVOCATION_DELIVERY=false`. Keep it disabled until the
migration and both guarded staging role journeys pass.
