import { polarClient } from "@polar-sh/better-auth/client";
import { magicLinkClient, customSessionClient } from "better-auth/client/plugins";
import type { Auth } from "@auth";
import { env } from "@env/web";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [magicLinkClient(), polarClient(), customSessionClient<Auth>()],
  advanced: {
    useCheckSession: true,
  },
});

export type AuthClientSession = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>
>;
