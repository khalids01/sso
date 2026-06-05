import { polarClient } from "@polar-sh/better-auth/client";
import { magicLinkClient, customSessionClient } from "better-auth/client/plugins";
import type { AuthClientSession } from "@auth/client";
import { env } from "@env/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    magicLinkClient(),
    polarClient(),
    customSessionClient<AuthClientSession>(),
  ],
  advanced: {
    useCheckSession: true,
  },
});

export type { AuthClientSession };
