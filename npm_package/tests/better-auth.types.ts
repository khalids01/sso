import { genericOAuth } from "better-auth/plugins";
import { createSsoBetterAuthProvider } from "../src/index.js";
import type {
  BetterAuthSsoClientOptions,
  SsoSession,
  SsoUser,
  VerifiedSsoIdentity,
} from "../src/types/index.js";

const provider = createSsoBetterAuthProvider({
  clientId: "client_123",
  baseUrl: "https://api-sso.skycanvasstudio.com",
});

genericOAuth({ config: [provider] });

const user: SsoUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
  image: null,
};
const session: SsoSession = { user, expiresAt: Date.now() + 60_000 };
const typeExports: [BetterAuthSsoClientOptions?, VerifiedSsoIdentity?] = [];
void session;
void typeExports;
