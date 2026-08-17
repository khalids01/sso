import { createMiddleware } from "@tanstack/react-start";
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
import { createSsoServer } from "../server/index.js";

interface TanStackSsoAdvancedOptions<TUser extends SsoUser> {
  appUrl?: string;
  interactionMode?: "hosted" | "embedded";
  oauthMode?: "redirect" | "popup";
  onSignIn?: Parameters<typeof createSsoServer<TUser>>[0]["onSignIn"];
}

export type CreateTanStackSsoOptions<TUser extends SsoUser = SsoUser> =
  TanStackSsoAdvancedOptions<TUser> & (
    | {
        publishableKey: string;
        secretKey: string;
        ssoUrl: string;
        clientId?: string;
        sessionSecret?: string;
      }
    | {
        clientId: string;
        sessionSecret: string;
        ssoUrl: string;
        publishableKey?: string;
        secretKey?: string;
      }
  );

export interface TanStackSsoAuth<TUser extends SsoUser = SsoUser> {
  isAuthenticated: boolean;
  userId: string | null;
  session: StandaloneSsoBootstrap<TUser>["session"];
}

export interface TanStackSsoMiddlewareTarget<TUser extends SsoUser = SsoUser> {
  getAuth(request: Request | Headers): Promise<TanStackSsoAuth<TUser>>;
  handle(request: Request): Promise<Response>;
  isAuthRequest(request: Request): boolean;
}

/**
 * Creates middleware without statically importing a consumer's server-only
 * configuration into `src/start.ts`. Wrap the loader with TanStack's
 * `createServerOnlyFn` so its dynamic import stays out of the client graph.
 */
export function createTanStackSsoMiddleware<TUser extends SsoUser = SsoUser>(
  load: () => Promise<TanStackSsoMiddlewareTarget<TUser>>,
) {
  return createMiddleware().server(async ({ request, next }) => {
    const skycanvas = await load();
    if (!skycanvas?.getAuth || !skycanvas?.handle || !skycanvas?.isAuthRequest) {
      throw new Error("TanStack SSO middleware loader must return createTanStackSso() output");
    }
    if (skycanvas.isAuthRequest(request)) return skycanvas.handle(request);
    return next({ context: { skycanvasAuth: await skycanvas.getAuth(request) } });
  });
}

/**
 * Clerk-style TanStack Start integration. Better Auth remains an internal SSO
 * implementation detail; consuming applications only install this package.
 */
export function createTanStackSso<TUser extends SsoUser = SsoUser>(
  options: CreateTanStackSsoOptions<TUser>,
) {
  const clientId = options.publishableKey ?? options.clientId;
  const sessionSecret = options.secretKey ?? options.sessionSecret;
  const ssoUrl = options.ssoUrl;
  if (!clientId) throw new Error("SkyCanvas publishableKey is required");
  if (!sessionSecret) throw new Error("SkyCanvas secretKey is required");
  if (!ssoUrl) throw new Error("SkyCanvas ssoUrl is required");
  const servers = new Map<string, SsoServer<TUser>>();

  const getServer = (origin: string) => {
    const appUrl = options.appUrl ?? origin;
    const cached = servers.get(appUrl);
    if (cached) return cached;
    const server = createSsoServer<TUser>({
      clientId,
      appUrl,
      sessionSecret,
      baseUrl: ssoUrl,
      ...(options.interactionMode ? { interactionMode: options.interactionMode } : {}),
      ...(options.oauthMode ? { oauthMode: options.oauthMode } : {}),
      ...(options.onSignIn ? { onSignIn: options.onSignIn } : {}),
    });
    servers.set(appUrl, server);
    return server;
  };

  const getAuth = async (request: Request | Headers): Promise<TanStackSsoAuth<TUser>> => {
    const origin = request instanceof Request
      ? originFromRequest(request, options.appUrl)
      : originFromHeaders(request, options.appUrl);
    const session = await getServer(origin).getSession(request);
    return {
      isAuthenticated: Boolean(session),
      userId: session?.user.id ?? null,
      session,
    };
  };

  const isAuthRequest = (request: Request) => {
    const server = getServer(originFromRequest(request, options.appUrl));
    return Object.values(server.paths).includes(new URL(request.url).pathname);
  };

  const handle = (request: Request) =>
    getServer(originFromRequest(request, options.appUrl)).handle(request);

  const middleware = createMiddleware().server(async ({ request, next }) => {
    if (isAuthRequest(request)) return handle(request);
    return next({ context: { skycanvasAuth: await getAuth(request) } });
  });

  const auth = async (): Promise<TanStackSsoAuth<TUser>> => {
    const headers = getRequestHeaders();
    return getAuth(headers);
  };

  const getBootstrap = async () => {
    const headers = getRequestHeaders();
    return getServer(originFromHeaders(headers, options.appUrl)).getBootstrap(headers);
  };

  return {
    middleware,
    auth,
    getAuth,
    getBootstrap,
    handle,
    isAuthRequest,
  };
}

function originFromRequest(request: Request, configuredOrigin?: string) {
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  if (request.headers.has("x-forwarded-host") || request.headers.has("host")) {
    return originFromHeaders(request.headers);
  }
  return new URL(request.url).origin;
}

function originFromHeaders(headers: Headers, configuredOrigin?: string) {
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) throw new Error("SkyCanvas could not determine the application origin; set appUrl");
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}

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
