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
import type { FreeSsoSession, FreeSsoUser } from "../index.js";
import type { FreeSsoClient } from "../client/index.js";

export type FreeSsoStatus = "loading" | "authenticated" | "unauthenticated";

export interface FreeSsoContextValue<TUser extends FreeSsoUser = FreeSsoUser> {
  session: FreeSsoSession<TUser> | null;
  status: FreeSsoStatus;
  login: (returnTo?: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<FreeSsoSession<TUser> | null>;
}

export interface FreeSsoProviderProps<TUser extends FreeSsoUser = FreeSsoUser> {
  client: FreeSsoClient<TUser>;
  initialSession?: FreeSsoSession<TUser> | null;
  children?: ReactNode;
}

const FreeSsoContext = createContext<FreeSsoContextValue<FreeSsoUser> | null>(null);

export function FreeSsoProvider<TUser extends FreeSsoUser = FreeSsoUser>(
  props: FreeSsoProviderProps<TUser>,
) {
  const [session, setSession] = useState<FreeSsoSession<TUser> | null>(props.initialSession ?? null);
  const [loading, setLoading] = useState(props.initialSession === undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const nextSession = await props.client.getSession();
      setSession(nextSession);
      return nextSession;
    } finally {
      setLoading(false);
    }
  }, [props.client]);

  useEffect(() => {
    if (props.initialSession === undefined) void refresh();
  }, [props.initialSession, refresh]);

  const logout = useCallback(async () => {
    await props.client.logout();
    setSession(null);
  }, [props.client]);

  const value = useMemo<FreeSsoContextValue<TUser>>(() => ({
    session,
    status: loading ? "loading" : session ? "authenticated" : "unauthenticated",
    login: props.client.login,
    logout,
    refresh,
  }), [loading, logout, props.client.login, refresh, session]);

  return createElement(
    FreeSsoContext.Provider,
    { value: value as FreeSsoContextValue<FreeSsoUser> },
    props.children,
  );
}

export function useFreeSso<TUser extends FreeSsoUser = FreeSsoUser>(): FreeSsoContextValue<TUser> {
  const value = useContext(FreeSsoContext);
  if (!value) throw new Error("useFreeSso must be used inside FreeSsoProvider");
  return value as FreeSsoContextValue<TUser>;
}

export function useFreeSsoSession<TUser extends FreeSsoUser = FreeSsoUser>() {
  const { session, status, refresh } = useFreeSso<TUser>();
  return { session, user: session?.user ?? null, status, refresh };
}
