# SSO

Centralized identity, access control, and SSO management for internal and customer-facing applications.

SSO is being built as the new control plane for company authentication. The current app provides Better Auth sessions, RBAC, owner/admin controls, application and client management, application memberships, invitations, activity logs, visitor analytics, rate limits, Redis-backed caches, and a TanStack admin UI. Its browser protocol now supports a deployment-gated authorization-code exchange with PKCE, pairwise application subjects, ten-minute RS256 tokens, and public JWKS verification.

## Stack

- **TypeScript** with Bun and Turborepo
- **TanStack Start** and React for the web app
- **Elysia** for the API server
- **Prisma** with PostgreSQL for durable data
- **Better Auth** for platform sessions
- **Redis** for RBAC/session caches, rate limits, and short-lived coordination
- **TailwindCSS** and shadcn/ui for UI primitives

## Getting Started

Install dependencies:

```bash
bun install
```

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Configure environment files from the examples:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Generate the Prisma client, run migrations, and seed RBAC:

```bash
bun run db:generate
bun run db:migrate
bun run db:seed
```

Run the development servers:

```bash
bun run dev
```

The web app runs at [http://localhost:5002](http://localhost:5002), and the API runs at [http://localhost:5001](http://localhost:5001).

Token issuance is disabled by default. Configure a stable `SSO_ISSUER` and set
`ENABLE_OAUTH_TOKEN_ISSUANCE=true` only in an environment approved for the new
protocol. The issuer is never inferred from the request host.

Polar is also disabled by default. Protected routes request customer state only
for billing-eligible `platform.user` identities. Platform admins and owners do
not require Polar customers, and a confirmed missing customer means no active
subscription; other Polar failures remain errors.

Google, Facebook, and GitHub credentials are configured on each application
client in the admin UI. Provider secrets are encrypted at rest and are
write-only after saving. Register the callback displayed by the client form,
for example `https://sso.example.com/api/auth/callback/google`. Keep
`SOCIAL_PROVIDER_CREDENTIALS_KEY` stable when it is configured; otherwise the
server derives the encryption key from `BETTER_AUTH_SECRET`.

## RBAC

Permissions and system role definitions live in `packages/rbac`. The role map is the seed default; runtime authorization reads from PostgreSQL and Redis.

- Routes declare required permissions with `requirePermission(Permissions.*)`.
- Effective permissions are cached per user in Redis and attached to the session context.
- The admin UI uses session permissions to guard routes and navigation.
- The owner role is protected; non-owner admins cannot view or mutate owner accounts.

Seed RBAC after migrations:

```bash
bun run db:seed
```

## Redis

Redis is required for SSO. The shared client lives in `packages/redis`, and the default key prefix is:

```bash
REDIS_KEY_PREFIX=sso:
```

To run Redis manually:

```bash
docker run --name sso-redis -p 6379:6379 -d redis:7-alpine
```

Redis stores short-lived and regeneratable data such as rate-limit counters, RBAC/session cache payloads, visitor flush coordination, and future token/session metadata. PostgreSQL remains the source of truth.

## Project Structure

```text
sso/
├── apps/
│   ├── web/         # TanStack Start frontend and admin UI
│   └── server/      # Elysia API server
├── packages/
│   ├── auth/        # Better Auth configuration and session types
│   ├── config/      # Shared product config
│   ├── db/          # Prisma schema, migrations, and server data access
│   ├── email/       # Email transport and templates
│   ├── env/         # Environment validation
│   ├── rbac/        # Permission and role catalog
│   └── redis/       # Shared Redis client
└── docs/            # Product plan, architecture, and progress tracking
```

## Useful Scripts

- `bun run dev`: start all apps in development mode
- `bun run dev:web`: start only the web app
- `bun run dev:server`: start only the API server
- `bun run build`: build all workspaces
- `bun run check-types`: type-check all workspaces
- `bun run db:generate`: generate Prisma client
- `bun run db:migrate`: run Prisma migrations
- `bun run db:seed`: seed RBAC defaults
- `bun run db:studio`: open Prisma Studio
- `bun e2e`: run the guarded Chromium browser suite for the selected actor role
- `bun e2e:headed`: watch the browser execute the E2E suite
- `bun e2e:ui`: open Playwright's interactive test UI

## Browser E2E Tests

Playwright lives in the isolated `tests/e2e` workspace. It authenticates through
the visible password form, derives expected behavior from the actor's effective
session permissions, uses uniquely prefixed records, and cleans only run-owned
data. It also verifies signed application revocation delivery through the
callback harness. Password login is disabled by default and must be enabled
explicitly in both server and web environments.

Application revocation delivery is also disabled by default:

```env
ENABLE_APPLICATION_REVOCATION_DELIVERY=false
ALLOW_LOCAL_APPLICATION_WEBHOOKS=false
```

The first flag starts the durable delivery worker. The second is only for local
E2E loopback receivers and is rejected in production. See
[`docs/application-revocation-webhooks.md`](docs/application-revocation-webhooks.md)
for the application backend contract.

Local Playwright launches the built API with `ENABLE_POLAR=false` explicitly,
independent of a developer's normal local billing configuration. Expected
streamed-SSR cancellation from browser navigation is handled only when the
request was aborted with the exact closed-connection `AbortError`; unrelated
SSR failures remain visible.

See [`tests/e2e/README.md`](tests/e2e/README.md) for safe local/staging setup,
role-selected commands, live debugging, artifacts, and interrupted-run cleanup.

## Product Direction

The old production SSO is a read-only behavioral reference. There is no pilot or
compatibility migration requirement from it, and development must not access or
mutate it. Applications can be integrated directly with the locally verified new
SSO contract; staging verification is currently deferred. Issuance and
revocation delivery stay disabled by default until deliberately enabled in the
target deployment. The design keeps platform/admin access separate from
client-application access:

- Platform RBAC controls the SSO admin/control plane.
- Identity users can exist without access to the SSO admin app.
- Client applications will have their own registrations, redirect URIs, secrets, memberships, app roles, and app-scoped tokens.
- Application login can independently expose magic-link or password sign-in,
  while registration can be closed, invitation-only, or open. Password signup
  and its email-verification requirement are configured per application.
- Google, Facebook, and GitHub become toggleable for an application only after
  at least one of its clients has saved provider credentials. A client without
  its own credentials cannot start that provider flow.

See `docs/plan.md`, `docs/architecture.md`, and `docs/todo-progress.md` for the
working plan. Upgrade-specific decisions are recorded in
`docs/better-auth-1.6.23-audit.md`, the legacy protocol in
`docs/legacy-client-contracts.md`, and staging verification in
`docs/staging-oauth-runbook.md`. The current dependency advisory classification
and remediation record is in `docs/dependency-security-review.md`.
