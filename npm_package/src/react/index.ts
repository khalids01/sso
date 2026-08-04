"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createSsoBetterAuthClient,
  type BetterAuthClientLike,
  type BetterAuthSsoClient,
  type SsoBetterAuthBootstrap,
  type SsoSession,
  type SsoUser,
} from "../index.js";
import {
  createSsoClient,
  type SsoClient,
  type SsoLoginOptions,
  type SsoLogoutOptions,
} from "../client/index.js";
import type { StandaloneSsoBootstrap } from "../server/index.js";

export {
  SsoSignInButton,
  SsoUserMenu,
  type SsoDisplayUser,
  type SsoMenuItem,
  type SsoSignInButtonProps,
  type SsoUserMenuProps,
} from "./components.js";

export type SsoStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface SsoContextValue<TUser extends SsoUser = SsoUser> {
  session: SsoSession<TUser> | null;
  status: SsoStatus;
  error: Error | null;
  login: (returnToOrOptions?: string | SsoLoginOptions) => void;
  logout: (options?: SsoLogoutOptions) => Promise<void>;
  refresh: () => Promise<SsoSession<TUser> | null>;
}

export interface LegacySsoProviderProps<TUser extends SsoUser = SsoUser> {
  /** @deprecated Pass the server-generated bootstrap instead. */
  client: SsoClient<TUser>;
  /** @deprecated Pass the server-generated bootstrap instead. */
  initialSession?: SsoSession<TUser> | null;
  bootstrap?: never;
  children?: ReactNode;
}

export interface BootstrapSsoProviderProps<TUser extends SsoUser = SsoUser> {
  bootstrap: StandaloneSsoBootstrap<TUser>;
  client?: never;
  initialSession?: never;
  children?: ReactNode;
}

export type SsoProviderProps<TUser extends SsoUser = SsoUser> =
  | LegacySsoProviderProps<TUser>
  | BootstrapSsoProviderProps<TUser>;

const SsoContext = createContext<SsoContextValue<SsoUser> | null>(null);

export function SsoProvider<TUser extends SsoUser = SsoUser>(props: SsoProviderProps<TUser>) {
  const bootstrap = "bootstrap" in props ? requireStandaloneBootstrap(props.bootstrap) : undefined;
  const legacyClient = "client" in props ? props.client : undefined;
  const client = useMemo(
    () => bootstrap ? createSsoClient<TUser>(bootstrap.client) : requireLegacyClient(legacyClient),
    [
      bootstrap?.client.baseUrl,
      bootstrap?.client.loginPath,
      bootstrap?.client.logoutPath,
      bootstrap?.client.profilePath,
      legacyClient,
    ],
  );
  const initialSession = bootstrap ? bootstrap.session : props.initialSession;
  const hasInitialSession = bootstrap !== undefined || props.initialSession !== undefined;
  const [session, setSession] = useState<SsoSession<TUser> | null>(initialSession ?? null);
  const [loading, setLoading] = useState(!hasInitialSession);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await client.getSession();
      setSession(nextSession);
      return nextSession;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO session refresh failed");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!hasInitialSession) void refresh().catch(() => undefined);
  }, [hasInitialSession, refresh]);

  const logout = useCallback(async (options?: SsoLogoutOptions) => {
    await client.logout(options);
    setSession(null);
    setError(null);
  }, [client]);

  const value = useMemo<SsoContextValue<TUser>>(() => ({
    session,
    status: loading ? "loading" : error ? "error" : session ? "authenticated" : "unauthenticated",
    error,
    login: client.login,
    logout,
    refresh,
  }), [client.login, error, loading, logout, refresh, session]);

  return createElement(
    SsoContext.Provider,
    { value: value as SsoContextValue<SsoUser> },
    props.children,
  );
}

export function useSso<TUser extends SsoUser = SsoUser>(): SsoContextValue<TUser> {
  const value = useContext(SsoContext);
  if (!value) {
    throw new Error(
      "useSso requires SsoProvider on the no-auth-library path. " +
      "Better Auth integrations must use the provider and hooks returned by createSsoBetterAuthReact.",
    );
  }
  return value as SsoContextValue<TUser>;
}

export function useOptionalSso<TUser extends SsoUser = SsoUser>() {
  return useContext(SsoContext) as SsoContextValue<TUser> | null;
}

export function useSsoSession<TUser extends SsoUser = SsoUser>() {
  const { session, status, error, refresh } = useSso<TUser>();
  return { session, user: session?.user ?? null, status, error, refresh };
}

export interface BetterAuthSessionLike<TUser = unknown> {
  user: TUser;
}

export interface BetterAuthSessionHook<TSession> {
  data: TSession | null;
  isPending: boolean;
  error: unknown;
}

export interface BetterAuthReactClient<TSession> extends BetterAuthClientLike {
  useSession: () => BetterAuthSessionHook<TSession>;
}

export interface BetterAuthSsoProviderProps<TSession> {
  bootstrap: SsoBetterAuthBootstrap<TSession>;
  children?: ReactNode;
}

export interface BetterAuthSsoContextValue<TSession extends BetterAuthSessionLike> {
  session: TSession | null;
  user: TSession["user"] | null;
  status: SsoStatus;
  isPending: boolean;
  error: unknown;
  signIn: BetterAuthSsoClient["signIn"];
  signOut: BetterAuthSsoClient["signOut"];
}

export interface BetterAuthSsoReact<TSession extends BetterAuthSessionLike> {
  SsoProvider: (props: BetterAuthSsoProviderProps<TSession>) => ReturnType<typeof createElement>;
  useSso: () => BetterAuthSsoContextValue<TSession>;
  useSsoSession: () => Pick<
    BetterAuthSsoContextValue<TSession>,
    "session" | "user" | "status" | "isPending" | "error"
  >;
}

export function createSsoBetterAuthReact<TSession extends BetterAuthSessionLike>(
  authClient: BetterAuthReactClient<TSession>,
): BetterAuthSsoReact<TSession> {
  if (!authClient || typeof authClient.useSession !== "function") {
    throw new Error("createSsoBetterAuthReact requires a Better Auth React client with useSession");
  }

  const Context = createContext<BetterAuthSsoContextValue<TSession> | null>(null);

  function BetterAuthProvider({ bootstrap, children }: BetterAuthSsoProviderProps<TSession>) {
    const initialData = requireBetterAuthBootstrap(bootstrap);
    const current = authClient.useSession();
    const sso = useMemo(() => createSsoBetterAuthClient({
      authClient,
      clientId: initialData.config.clientId,
      baseUrl: initialData.config.baseUrl,
    }), [initialData.config.baseUrl, initialData.config.clientId]);
    const session = current.isPending ? initialData.session : (current.data ?? null);
    const isPending = current.isPending && initialData.session === null;
    const status: SsoStatus = isPending
      ? "loading"
      : current.error
        ? "error"
        : session
          ? "authenticated"
          : "unauthenticated";
    const value = useMemo<BetterAuthSsoContextValue<TSession>>(() => ({
      session,
      user: session?.user ?? null,
      status,
      isPending,
      error: current.error,
      signIn: sso.signIn,
      signOut: sso.signOut,
    }), [current.error, isPending, session, sso.signIn, sso.signOut, status]);

    return createElement(Context.Provider, { value }, children);
  }

  function useBetterAuthSso(): BetterAuthSsoContextValue<TSession> {
    const value = useContext(Context);
    if (!value) {
      throw new Error(
        "useSso requires the SsoProvider returned by createSsoBetterAuthReact. " +
        "Mount it once with bootstrap data from createSsoBetterAuthIntegration.",
      );
    }
    return value;
  }

  function useBetterAuthSsoSession() {
    const { session, user, status, isPending, error } = useBetterAuthSso();
    return { session, user, status, isPending, error };
  }

  return {
    SsoProvider: BetterAuthProvider,
    useSso: useBetterAuthSso,
    useSsoSession: useBetterAuthSsoSession,
  };
}

function requireStandaloneBootstrap<TUser extends SsoUser>(
  value: StandaloneSsoBootstrap<TUser> | undefined,
): StandaloneSsoBootstrap<TUser> {
  if (
    !value ||
    value.kind !== "standalone" ||
    !value.client ||
    !isAbsoluteUrl(value.client.baseUrl) ||
    !isPath(value.client.loginPath) ||
    !isPath(value.client.profilePath) ||
    !isPath(value.client.logoutPath)
  ) {
    throw new Error("SsoProvider requires bootstrap data returned by sso.getBootstrap(request)");
  }
  return value;
}

function requireLegacyClient<TUser extends SsoUser>(
  value: SsoClient<TUser> | undefined,
): SsoClient<TUser> {
  if (!value) {
    throw new Error("SsoProvider requires bootstrap data returned by sso.getBootstrap(request)");
  }
  return value;
}

function requireBetterAuthBootstrap<TSession>(
  value: SsoBetterAuthBootstrap<TSession>,
): SsoBetterAuthBootstrap<TSession> {
  if (
    !value ||
    value.kind !== "better-auth" ||
    value.config?.providerId !== "skycanvas" ||
    typeof value.config.clientId !== "string" ||
    !value.config.clientId.trim() ||
    !isAbsoluteUrl(value.config.baseUrl)
  ) {
    throw new Error(
      "Better Auth SsoProvider requires bootstrap data from createSsoBetterAuthIntegration.createBootstrap",
    );
  }
  return value;
}

function isAbsoluteUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/");
}
