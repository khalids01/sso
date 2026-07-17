# Dependency Security Review

Reviewed on 2026-07-17 with Bun 1.3.3.

## Outcome

The initial `bun audit` reported 107 advisories. Targeted compatible updates
reduced the report to 66. The remaining report is not clean, but no known
unmitigated advisory remains in the deployed API or web runtime.

This review does not treat a lower audit count as proof of safety. Each remaining
package path was classified by whether it is reachable in deployed code, local
development tooling, build tooling, or an unused optional peer.

## Patched Runtime And Build Boundaries

- Elysia was updated from 1.4.25 to 1.4.29. This includes the URL-format ReDoS
  and cookie parsing fixes published in 1.4.26 and later.
- Elysia's optional `file-type` runtime was pinned to patched 21.3.1.
- Nodemailer was updated from 8.0.4 to 9.0.3. The application uses the normal
  SMTP `sendMail` path and does not accept raw messages, attachment paths, URL
  content, JSON transport configuration, OAuth2 transport configuration, or
  transport names from users.
- TanStack Start was updated from 1.161.3 to 1.168.28. Its resolved
  `@tanstack/start-server-core` is 1.169.17, above the 1.167.30 fix for unsafe
  inbound server-function deserialization.
- Vite, Tailwind's Vite adapter, the React Vite plugin, Turbo, Elysia adapters,
  Prisma's PostgreSQL adapter, React Email tooling, shadcn tooling, and related
  lockfile dependencies were updated within their compatible release lines.
- The stricter TanStack import boundary is kept enabled. Public browser
  configuration now comes from `env.public.ts`; SSR code no longer imports a
  file marked client-only.

Relevant upstream advisories:

- [TanStack Start server-function deserialization](https://github.com/advisories/GHSA-9m65-766c-r333)
- [Elysia URL-format ReDoS](https://github.com/advisories/GHSA-f45g-68q3-5w8x)
- [Elysia cookie prototype pollution](https://github.com/advisories/GHSA-8hq9-phh3-p2wp)
- [Nodemailer raw-message access-control bypass](https://github.com/advisories/GHSA-p6gq-j5cr-w38f)

## Remaining Audit Report

The remaining 66 findings fall into these reviewed groups:

1. `@better-auth/oauth-provider` 1.6.23 remains affected by the unbound resource
   indicator advisory. There is no patched stable 1.6 release. Better Auth's
   token and refresh endpoints remain disabled, the SSO-owned endpoint rejects
   `resource`, audiences are derived from the code-bound application/client, and
   regression tests cover those boundaries. Upgrade when the first compatible
   patched stable release is available.
2. shadcn, React Email preview, Prisma CLI, tsdown, Vite, Turbo, and TanStack
   router generation bring audit findings through CLI/build dependencies such as
   Hono, Next, ws, glob matchers, YAML/CSS parsers, Babel, AJV, and diff tools.
   These tools process trusted repository inputs locally and are not application
   request handlers in the deployed API or web server.
3. Bun reports some package families without distinguishing safe and vulnerable
   installed copies. The deployed Better Auth path resolves patched `defu`
   6.1.7; the vulnerable 6.1.4 copy belongs to tsdown. React Email resolves
   patched Next 16.2.6; the vulnerable Next copy is an unused optional Better
   Auth peer. The deployed Vite path resolves patched PostCSS 8.5.19.

Do not force global transitive overrides merely to hide these reports. Several
affected package names are installed in multiple incompatible major versions,
and a global override could break their owners. Recheck the report during normal
dependency maintenance and take upstream compatible fixes as they become
available.

## Verification

- Server: 205 tests passed.
- E2E helpers: 8 tests passed.
- Workspace type checks passed.
- API build passed.
- Web client and SSR build passed with the stricter TanStack import boundary.
- Admin browser journey: 7 passed.
- User browser journey: 6 passed, 1 intentionally skipped.
- `git diff --check` passed.

No database schema or migration changed during this review.
