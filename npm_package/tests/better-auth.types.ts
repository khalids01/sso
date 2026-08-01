import { genericOAuth } from "better-auth/plugins";
import { createSsoBetterAuthProvider } from "../src/better-auth/index.js";

const provider = createSsoBetterAuthProvider({
  clientId: "client_123",
});

genericOAuth({ config: [provider] });
