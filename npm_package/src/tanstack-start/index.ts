import { getRequestHeaders } from "@tanstack/react-start/server";

import type {
  SsoBetterAuthBootstrap,
  SsoBetterAuthIntegration,
  SsoUser,
} from "../index.js";
import type {
  SsoServer,
  StandaloneSsoBootstrap,
} from "../server/index.js";

export interface BetterAuthServerLike<TSession> {
  api: {
    getSession: (input: { headers: Headers }) => Promise<TSession | null>;
  };
}

export interface BetterAuthServerIntegration<TSession> {
  auth: BetterAuthServerLike<TSession>;
  skycanvas: SsoBetterAuthIntegration;
}

export async function getTanStackBetterAuthSsoBootstrap<TSession>(
  load: () => Promise<BetterAuthServerIntegration<TSession>>,
): Promise<SsoBetterAuthBootstrap<TSession>> {
  const { auth, skycanvas } = await load();
  if (!auth?.api?.getSession || !skycanvas?.createBootstrap) {
    throw new Error("TanStack Better Auth SSO bootstrap loader must return auth and skycanvas");
  }
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  return skycanvas.createBootstrap(session);
}

export async function getTanStackStandaloneSsoBootstrap<TUser extends SsoUser>(
  load: () => Promise<SsoServer<TUser>>,
): Promise<StandaloneSsoBootstrap<TUser>> {
  const sso = await load();
  if (!sso?.getBootstrap) {
    throw new Error("TanStack standalone SSO bootstrap loader must return an SsoServer");
  }
  return sso.getBootstrap(getRequestHeaders());
}
