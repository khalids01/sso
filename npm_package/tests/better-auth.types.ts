import { genericOAuth } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";
import { createSsoBetterAuthIntegration } from "../src/index.js";
import { createSsoBetterAuthReact } from "../src/react/index.js";
import type {
  SsoSession,
  SsoUser,
  VerifiedSsoIdentity,
} from "../src/types/index.js";

const skycanvas = createSsoBetterAuthIntegration({
  clientId: "client_123",
  baseUrl: "https://api-sso.skycanvasstudio.com",
});

genericOAuth({ config: [skycanvas.provider] });

const authClient = createAuthClient({ plugins: [genericOAuthClient()] });
const reactIntegration = createSsoBetterAuthReact(authClient);
const bootstrap = skycanvas.createBootstrap<typeof authClient.$Infer.Session>(null);
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
