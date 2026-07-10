# SSO Branding

This file records the applied product branding for this repository.

## Product Values

- Product name: `SSO`
- Short text logo: `SSO`
- Package/app slug: `sso`
- Redis key prefix: `sso:`
- One-line description: `Centralized identity, access control, and SSO management for internal and customer-facing applications.`

## Branding Rules

- Use `SSO` for user-facing product text, page metadata, emails, navigation, and documentation.
- Use `sso` for machine names such as package names, container names, Redis prefixes, and future app slugs.
- Keep platform/admin access separate from client-application access in product copy and architecture docs.
- Avoid describing this repo as a template. It is now the SSO product foundation.

## Places To Check When Branding Changes

- `README.md`
- `docs/`
- `package.json`
- `docker-compose.yml`
- `apps/server/.env.example`
- `packages/env/src/env.server.ts`
- `packages/config/src/config.ts`
- `packages/auth/src/auth-options.server.ts`
- `packages/email/src/templates/`
- `apps/web/src/components/core/logo.tsx`
- `apps/web/src/features/landing/components/`

## Verification

After branding edits, run:

```bash
rg -n "old-product-name|old-slug|old-redis-prefix" .
bun run check-types
```

If package metadata changes, run `bun install` so lockfile metadata stays in sync.
