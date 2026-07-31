# @skycanvasstudio/free-sso

Headless TypeScript helpers for integrating SkyCanvas SSO on the server, in the browser, and with React. The package has no UI.

## Install

```bash
npm install @skycanvasstudio/free-sso
```

Install React only when using the React entry point.

## Better Auth server configuration

```ts
import { genericOAuth } from "better-auth/plugins";
import { createFreeSsoBetterAuthProvider } from "@skycanvasstudio/free-sso/server";

const provider = createFreeSsoBetterAuthProvider({
  clientId: process.env.SSO_CLIENT_ID!,
});

export const auth = betterAuth({
  plugins: [genericOAuth({ config: [provider] })],
});
```

Register Better Auth's exact callback URL:

```text
https://your-domain.example/api/auth/oauth2/callback/skycanvas
```

## Manual server flow

The server must store `flow` in an encrypted, HttpOnly, SameSite cookie. Never expose it to browser JavaScript.

```ts
import {
  createFreeSsoAuthorization,
  finishFreeSsoAuthorization,
} from "@skycanvasstudio/free-sso/server";

const { url, flow } = await createFreeSsoAuthorization({
  clientId: process.env.SSO_CLIENT_ID!,
  redirectUri: "https://your-domain.example/auth/callback",
  returnTo: "/dashboard",
});

// Store `flow` securely, then redirect to `url`.

const result = await finishFreeSsoAuthorization({
  clientId: process.env.SSO_CLIENT_ID!,
  code,
  state,
  flow,
});

// Create your application's own session from `result.user`.
```

The package verifies PKCE state, flow age, issuer, audience, token signatures, nonce, and matching token subjects. Your application remains responsible for encrypted flow storage, its session cookie, routes, database, and authorization rules.

## Browser client

The browser client talks only to your application's auth routes. OAuth tokens remain on the server.

```ts
import { createFreeSsoClient } from "@skycanvasstudio/free-sso/client";

export const sso = createFreeSsoClient({
  loginPath: "/auth/login",
  profilePath: "/auth/profile",
  logoutPath: "/auth/logout",
});

sso.login("/dashboard");
const session = await sso.getSession();
await sso.logout();
```

Expected profile response:

```json
{
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "emailVerified": true,
    "image": null
  }
}
```

## React hooks

```ts
import { FreeSsoProvider, useFreeSsoSession } from "@skycanvasstudio/free-sso/react";
```

Wrap the application with `FreeSsoProvider` and pass the browser client as `client`. Use `useFreeSso()` for login, logout, and refresh, or `useFreeSsoSession()` for session state.
