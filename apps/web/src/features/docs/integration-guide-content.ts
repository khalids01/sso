export type CodeSample = {
  title?: string;
  tabLabel?: string;
  filename: string;
  code: string;
  description?: string;
  alternatives?: CodeSample[];
};

export const securityChecklist = [
  "Choose one integration path and do not create a second session system.",
  "Register the exact callback URL produced by your selected integration path.",
  "Use HTTPS for every production app, API, callback, and SSO origin.",
  "Keep session secrets server-only; never put them in VITE_ or NEXT_PUBLIC_ variables.",
  "Use an HttpOnly application cookie for full-stack apps; use only short-lived verified tokens in React-only apps.",
  "Validate issuer, audience, signature, expiry, and subject on every protected API token.",
  "Allow only relative return paths and use exact allowed origins.",
  "Test new users, returning users, logout, invalid callbacks, and protected routes.",
] as const;

export const integrationComparison = [
  {
    mode: "React-only",
    chooseWhen: "Vite/SPA frontend with a separate API or no backend",
    sessionOwner: "SkyCanvas SDK in the browser",
    credential: "Short-lived app access token",
    appAuthServer: "No",
  },
  {
    mode: "Full-stack standalone",
    chooseWhen: "TanStack Start, Next.js, Elysia, Express, or NestJS",
    sessionOwner: "@skycanvasstudio/sso server adapter",
    credential: "Encrypted first-party HttpOnly cookie",
    appAuthServer: "Small framework adapter",
  },
  {
    mode: "Better Auth",
    chooseWhen: "The app already has working Better Auth",
    sessionOwner: "Better Auth",
    credential: "Better Auth first-party cookie",
    appAuthServer: "Existing Better Auth route",
  },
  {
    mode: "Generic OAuth/OIDC",
    chooseWhen: "Another auth library already owns app sessions",
    sessionOwner: "Your existing auth library",
    credential: "Library-owned cookie/session",
    appAuthServer: "Existing auth callback",
  },
] as const;

export const troubleshootingItems = [
  {
    problem: "redirect_uri is invalid or login returns 403",
    fix: "Copy the exact callback URL from the selected guide into the application client. Paths, ports, schemes, and trailing slashes must match.",
  },
  {
    problem: "React popup signs in but the opener never updates",
    fix: "Make /auth/callback load the same SPA entry and register the frontend origin. Do not proxy that route to a removed local auth server.",
  },
  {
    problem: "Token exchange fails from a React app",
    fix: "Add the exact frontend origin to Allowed origins and confirm OAuth token issuance is enabled on the SkyCanvas deployment.",
  },
  {
    problem: "Session disappears after callback in a full-stack app",
    fix: "Use HTTPS in production, keep appUrl equal to the public app origin, and verify proxy forwarded host/protocol headers and cookie SameSite settings.",
  },
  {
    problem: "Hooks say the provider is missing",
    fix: "Mount exactly one provider above the route tree and use hooks from the same integration path. Do not mix Better Auth-generated hooks with standalone hooks.",
  },
  {
    problem: "Protected UI works but API requests are still public",
    fix: "SignedIn only controls rendering. Verify the Bearer token in a React-only app API, or read the verified server session in a full-stack app before returning protected data.",
  },
] as const;
