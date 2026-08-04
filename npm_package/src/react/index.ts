"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type BetterAuthClientLike,
  type BetterAuthSsoActions,
  type SsoBetterAuthBootstrap,
  type SsoSession,
  type SsoUser,
  safeReturnTo,
} from "../index.js";
import {
  createSsoClient,
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

export interface SsoProviderProps<TUser extends SsoUser = SsoUser> {
  bootstrap: StandaloneSsoBootstrap<TUser>;
  children?: ReactNode;
}

const SsoContext = createContext<SsoContextValue<SsoUser> | null>(null);

export function SsoProvider<TUser extends SsoUser = SsoUser>(props: SsoProviderProps<TUser>) {
  const bootstrap = requireStandaloneBootstrap(props.bootstrap);
  const client = useMemo(
    () => createSsoClient<TUser>(bootstrap.client),
    [
      bootstrap.client.baseUrl,
      bootstrap.client.loginPath,
      bootstrap.client.logoutPath,
      bootstrap.client.profilePath,
    ],
  );
  const [session, setSession] = useState<SsoSession<TUser> | null>(bootstrap.session ?? null);
  const [loading, setLoading] = useState(false);
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

export function useOptionalSso<TUser extends SsoUser = SsoUser>() {
  return useContext(SsoContext) as SsoContextValue<TUser> | null;
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
  signIn: BetterAuthSsoActions["signIn"];
  signOut: BetterAuthSsoActions["signOut"];
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
    const signIn = useCallback(
      (callbackURL = "/") => authClient.signIn.oauth2({ providerId: "skycanvas", callbackURL }),
      [],
    );
    const signOut = useCallback(async (options: { global?: boolean; returnTo?: string } = {}) => {
      const result = await authClient.signOut();
      if (result.error || options.global === false) return result;
      if (typeof window === "undefined") {
        throw new Error("SSO global logout requires a browser");
      }
      const returnTo = new URL(safeReturnTo(options.returnTo), window.location.origin);
      const logoutUrl = new URL("/api/auth/global-sign-out", initialData.config.baseUrl);
      logoutUrl.searchParams.set("client_id", initialData.config.clientId);
      logoutUrl.searchParams.set("return_to", returnTo.toString());
      window.location.assign(logoutUrl.toString());
      return result;
    }, [initialData.config.baseUrl, initialData.config.clientId]);
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
      signIn,
      signOut,
    }), [current.error, isPending, session, signIn, signOut, status]);

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
