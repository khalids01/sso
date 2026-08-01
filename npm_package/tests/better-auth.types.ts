import { genericOAuth } from "better-auth/plugins";
import { createFreeSsoBetterAuthProvider } from "../src/server/index.js";

const provider = createFreeSsoBetterAuthProvider({
  clientId: "client_123",
});

genericOAuth({ config: [provider] });
