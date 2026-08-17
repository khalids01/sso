import { headers } from "next/headers.js";

import type {
  SsoBetterAuthBootstrap,
  SsoBetterAuthIntegration,
  SsoUser,
} from "../index.js";
import type {
  CreateSsoServerOptions,
  SsoServer,
  StandaloneSsoBootstrap,
} from "../server/index.js";
import { createSsoServer } from "../server/index.js";

export interface NextBetterAuthServerLike<TSession> {
  api: {
    getSession: (input: { headers: Headers }) => Promise<TSession | null>;
  };
}

export async function getNextBetterAuthSsoBootstrap<TSession>(options: {
  auth: NextBetterAuthServerLike<TSession>;
  skycanvas: SsoBetterAuthIntegration;
}): Promise<SsoBetterAuthBootstrap<TSession>> {
  if (!options.auth?.api?.getSession || !options.skycanvas?.createBootstrap) {
    throw new Error("Next.js Better Auth SSO bootstrap requires auth and skycanvas");
  }
  const session = await options.auth.api.getSession({ headers: await headers() });
  return options.skycanvas.createBootstrap(session);
}

export async function getNextStandaloneSsoBootstrap<TUser extends SsoUser>(options: {
  sso: SsoServer<TUser>;
}): Promise<StandaloneSsoBootstrap<TUser>> {
  if (!options.sso?.getBootstrap) {
    throw new Error("Next.js standalone SSO bootstrap requires an SsoServer");
  }
  return options.sso.getBootstrap(await headers());
}

/**
 * Clerk-style Next.js App Router integration. Mount GET, POST, and OPTIONS from
 * the returned handlers in `app/auth/[...sso]/route.ts`.
 */
export function createNextSso<TUser extends SsoUser = SsoUser>(
  options: CreateSsoServerOptions<TUser>,
) {
  const sso = createSsoServer(options);
  const handler = (request: Request) => sso.handle(request);

  return {
    sso,
    handlers: {
      GET: handler,
      POST: handler,
      OPTIONS: handler,
    },
    auth: async () => {
      const session = await sso.getSession(await headers());
      return {
        isAuthenticated: Boolean(session),
        userId: session?.user.id ?? null,
        session,
      };
    },
    getBootstrap: () => getNextStandaloneSsoBootstrap({ sso }),
  };
}
