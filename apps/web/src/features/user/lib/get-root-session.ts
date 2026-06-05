import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { toClientSession, type ClientSessionResult } from "@auth";

import { authClient } from "@/lib/auth-client";

export const getRootSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientSessionResult> => {
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
