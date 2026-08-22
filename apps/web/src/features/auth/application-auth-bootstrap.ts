import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "@sso/env/public";

import type { ApplicationAuthPolicy } from "./application-auth-shell";

type ApplicationAuthBootstrapInput = {
  clientId: string;
  oauthQuery: string;
};

export type ApplicationAuthBootstrap = {
  name: string;
  logoUrl: string | null;
  policy: ApplicationAuthPolicy;
  isAuthenticated: boolean;
};

export const getApplicationAuthBootstrap = createServerFn({ method: "POST" })
  .validator((data: ApplicationAuthBootstrapInput) => data)
  .handler(async ({ data }): Promise<ApplicationAuthBootstrap> => {
    const requestHeaders = new Headers();
    const headers = getRequestHeaders();
    const cookie = headers.get("cookie");
    const authorization = headers.get("authorization");

    if (cookie) requestHeaders.set("cookie", cookie);
    if (authorization) requestHeaders.set("authorization", authorization);

    const response = await fetch(`${env.VITE_SERVER_URL}/auth/application/bootstrap`, {
      method: "POST",
      headers: {
        ...Object.fromEntries(requestHeaders.entries()),
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Invalid or expired application authentication request");
    }

    return response.json() as Promise<ApplicationAuthBootstrap>;
  });
