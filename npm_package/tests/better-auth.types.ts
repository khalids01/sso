import { createAuthClient } from "better-auth/react";
import { skycanvas, skycanvasClient } from "../src/better-auth/index.js";
import { createSsoBetterAuthReact } from "../src/react/index.js";
import type {
  SsoSession,
  SsoUser,
  VerifiedSsoIdentity,
} from "../src/types/index.js";

skycanvas({
  publishableKey: "client_123",
  ssoUrl: "https://api-sso.skycanvasstudio.com",
});

const authClient = createAuthClient({ plugins: [skycanvasClient()] });
const reactIntegration = createSsoBetterAuthReact(authClient);
const bootstrap = {
  kind: "better-auth" as const,
  config: {
    providerId: "skycanvas" as const,
    clientId: "client_123",
    baseUrl: "https://api-sso.skycanvasstudio.com",
  },
  session: null as typeof authClient.$Infer.Session | null,
};
const providerProps: Parameters<typeof reactIntegration.SsoProvider>[0] = {
  bootstrap,
};

const user: SsoUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: null,
};
const session: SsoSession = { user, expiresAt: Date.now() + 60_000 };
const typeExports: [VerifiedSsoIdentity?] = [];
void session;
void providerProps;
void typeExports;
