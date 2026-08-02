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
import type { SsoSession, SsoUser } from "../index.js";
import type { SsoClient, SsoLoginOptions, SsoLogoutOptions } from "../client/index.js";

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
  client: SsoClient<TUser>;
  initialSession?: SsoSession<TUser> | null;
  children?: ReactNode;
}

const SsoContext = createContext<SsoContextValue<SsoUser> | null>(null);

export function SsoProvider<TUser extends SsoUser = SsoUser>(props: SsoProviderProps<TUser>) {
  const [session, setSession] = useState<SsoSession<TUser> | null>(props.initialSession ?? null);
  const [loading, setLoading] = useState(props.initialSession === undefined);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await props.client.getSession();
      setSession(nextSession);
      return nextSession;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO session refresh failed");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [props.client]);

  useEffect(() => {
    if (props.initialSession === undefined) void refresh().catch(() => undefined);
  }, [props.initialSession, refresh]);

  const logout = useCallback(async (options?: SsoLogoutOptions) => {
    await props.client.logout(options);
    setSession(null);
    setError(null);
  }, [props.client]);

  const value = useMemo<SsoContextValue<TUser>>(() => ({
    session,
    status: loading ? "loading" : error ? "error" : session ? "authenticated" : "unauthenticated",
    error,
    login: props.client.login,
    logout,
    refresh,
  }), [error, loading, logout, props.client.login, refresh, session]);

  return createElement(
    SsoContext.Provider,
    { value: value as SsoContextValue<SsoUser> },
    props.children,
  );
}

export function useSso<TUser extends SsoUser = SsoUser>(): SsoContextValue<TUser> {
  const value = useContext(SsoContext);
  if (!value) throw new Error("useSso must be used inside SsoProvider");
  return value as SsoContextValue<TUser>;
}

export function useOptionalSso<TUser extends SsoUser = SsoUser>() {
  return useContext(SsoContext) as SsoContextValue<TUser> | null;
}

export function useSsoSession<TUser extends SsoUser = SsoUser>() {
  const { session, status, error, refresh } = useSso<TUser>();
  return { session, user: session?.user ?? null, status, error, refresh };
}
