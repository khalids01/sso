# SSO Browser E2E Tests

This workspace runs Playwright against the configured real PostgreSQL and Redis
services. It never migrates, resets, truncates, seeds, or flushes those services.
Every mutable product record uses an `e2e-<run-id>-` prefix and teardown removes
only data owned by that run.

The suite also starts an isolated loopback callback server. Setup provisions a
run-owned public client with that exact callback and origin, and the browser
drives the real authorization UI before exchanging the captured code. The
fixture validates both JWTs against the API JWKS and clears the code and token
values after each journey. No production callback route is added.

## First-time setup

Install dependencies and Chromium:

```bash
bun install
bun e2e:install
```

Enable password login in both applications:

```env
# apps/server/.env
ENABLE_PASSWORD_AUTH=true

# apps/web/.env
VITE_ENABLE_PASSWORD_AUTH=true
```

Copy `tests/e2e/.env.example` to `tests/e2e/.env`. Replace every placeholder
with dedicated E2E identities and a generated password of 15-128 characters.
Both the actor and membership-test identity must appear in
`E2E_ALLOWED_ACTOR_EMAILS`. Never use a personal or production owner account.

An owner actor must already exist. E2E will not promote it; bootstrap it through:

```bash
OWNER_EMAIL=e2e-owner@example.com OWNER_NAME="E2E Owner" bun make-owner
```

## Running tests

Select one effective role in the E2E env file or for a single command:

```bash
E2E_ACTOR_ROLE=admin bun e2e
E2E_ACTOR_ROLE=user bun e2e
E2E_ACTOR_ROLE=owner bun e2e
```

The setup provisions the dedicated identity, rotates its password, assigns the
requested non-owner role, logs in through the visible form, then derives expected
behavior from the real session permissions. Owner creation always stays outside
Playwright.

Watch or debug the browser:

```bash
bun e2e:headed
bun e2e:ui
bun e2e:debug
```

Set `E2E_SLOW_MO=300` to slow visible actions. A red pointer and click ripple are
included in headed runs and recorded videos by default; set
`E2E_SHOW_CURSOR=false` to hide them. On failure, Playwright retains a
screenshot, video, trace, browser console errors, failed requests, and an HTML
report. Open the report with:

```bash
bun e2e:report
```

## Staging and recovery

Staging requires `E2E_TARGET=staging`, exact web/API/database/Redis allowlists,
direct staging service URLs for provisioning and cleanup, and the explicit
mutation acknowledgement. Staging mode never starts local processes and refuses
known production origins or cross-origin redirects.

Set `SSO_ISSUER` to the exact staging API issuer and follow the complete
deployment, verification, and rollback procedure in
[`docs/staging-oauth-runbook.md`](../../docs/staging-oauth-runbook.md).

If a run is interrupted before teardown, recover only that run's prefixed data:

```bash
bun e2e:cleanup --run-id <exact-run-id>
```

Browser artifacts contain authenticated page content. Keep CI artifact access
restricted and use short retention periods.
