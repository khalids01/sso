import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { ClientSessionResult } from "@auth/client";

import { client } from "@/lib/client";

export const getRootSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientSessionResult> => {
    const headers = getRequestHeaders();

    try {
      const response = await client.session.context.get({
        fetch: {
          headers,
          credentials: "include",
        },
      });

      if (response.error || !response.data?.user) {
        return null;
      }

      const { user, permissions, roles, primaryRoleSlug } = response.data;

      return {
        user,
        permissions,
        roles,
        primaryRoleSlug,
      };
    } catch {
      return null;
    }
  },
);
