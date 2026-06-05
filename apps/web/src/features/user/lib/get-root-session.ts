import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { authClient } from "@/lib/auth-client";
import type { ClientSession } from "@/features/user/lib/client-session";
import { toClientSession } from "@/features/user/lib/to-client-session";

export const getRootSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientSession> => {
    const headers = getRequestHeaders();

    try {
      const session = await authClient.getSession({
        fetchOptions: {
          headers,
          throw: true,
        },
      });

      return toClientSession(session);
    } catch {
      return null;
    }
  },
);
