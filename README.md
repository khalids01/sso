# SSO

Centralized identity, access control, and SSO management for internal and customer-facing applications.

SSO is being built as the new control plane for company authentication. The current app already provides the platform foundation: Better Auth sessions, RBAC, owner/admin controls, user management, invitations, activity logs, visitor analytics, rate limits, Redis-backed caches, and a TanStack admin UI. The next product layer will add application/client management and app-scoped authentication flows.

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

## Product Direction

The old production SSO remains the behavioral reference for existing app integrations. This app is the replacement foundation. The target design keeps platform/admin access separate from client-application access:

- Platform RBAC controls the SSO admin/control plane.
- Identity users can exist without access to the SSO admin app.
- Client applications will have their own registrations, redirect URIs, secrets, memberships, app roles, and app-scoped tokens.

See `docs/plan.md`, `docs/architecture.md`, and `docs/todo-progress.md` for the working plan.
