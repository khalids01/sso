import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import type { ClientSession, ClientSessionResult } from "@auth/client";
import { env } from "@env/client";

type BackendSessionContext =
  | ClientSession
  | {
      user: null;
      permissions: [];
      roles: [];
      primaryRoleSlug: null;
    };

function normalizeSessionContext(
  session: BackendSessionContext,
): ClientSessionResult {
  return session.user ? session : null;
}

export const getRootSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientSessionResult> => {
    const headers = getRequestHeaders();
    const requestHeaders = new Headers();

    const cookie = headers.get("cookie");
    const authorization = headers.get("authorization");

    if (cookie) {
      requestHeaders.set("cookie", cookie);
    }

    if (authorization) {
      requestHeaders.set("authorization", authorization);
    }

    try {
      const response = await fetch(`${env.VITE_SERVER_URL}/session/context`, {
        headers: requestHeaders,
      });

      if (!response.ok) {
        return null;
      }

      const session = (await response.json()) as BackendSessionContext;
      return normalizeSessionContext(session);
    } catch (error) {
      console.error("[getRootSession] session context request failed", error);
      return null;
    }
  },
);
