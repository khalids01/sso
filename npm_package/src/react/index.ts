"use client";

import {
  createContext,
  createElement,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type BetterAuthClientLike,
  type BetterAuthSsoActions,
  type SsoBetterAuthBootstrap,
  type SsoSession,
  type SsoClientMetadata,
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
  SignIn,
  SignUp,
  SsoAuth,
  SsoAuthDialog,
  type SsoAuthProps,
  type SsoAuthDialogProps,
} from "./auth-components.js";

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
  metadata: SsoClientMetadata | null;
  interactionMode: "hosted" | "embedded";
  oauthMode: "redirect" | "popup";
  login: (returnToOrOptions?: string | SsoLoginOptions) => void;
  signIn: (options?: SsoLoginOptions) => Promise<SsoSession<TUser> | null>;
  signInWithPassword: (input: { email: string; password: string; returnTo?: string }) => Promise<SsoSession<TUser> | null>;
  signUpWithPassword: (input: { name: string; email: string; password: string; returnTo?: string }) => Promise<{ session: SsoSession<TUser> | null; requiresEmailVerification: boolean }>;
  sendMagicLink: (input: { intent?: "signin" | "signup"; name?: string; email: string; returnTo?: string }) => Promise<void>;
  logout: (options?: SsoLogoutOptions) => Promise<void>;
  refresh: () => Promise<SsoSession<TUser> | null>;
}

export interface SsoProviderProps<TUser extends SsoUser = SsoUser> {
  bootstrap?: StandaloneSsoBootstrap<TUser>;
  baseUrl?: string;
  children?: ReactNode;
}

const SsoContext = createContext<SsoContextValue<SsoUser> | null>(null);

export function SsoProvider<TUser extends SsoUser = SsoUser>(props: SsoProviderProps<TUser>) {
  const bootstrap = props.bootstrap ? requireStandaloneBootstrap(props.bootstrap) : undefined;
  const clientOptions = bootstrap?.client;
  const client = useMemo(
    () => createSsoClient<TUser>({
      ...(props.baseUrl ? { baseUrl: props.baseUrl } : clientOptions?.baseUrl ? { baseUrl: clientOptions.baseUrl } : {}),
      ...(clientOptions ? {
        loginPath: clientOptions.loginPath,
        profilePath: clientOptions.profilePath,
        logoutPath: clientOptions.logoutPath,
      } : {}),
      ...(clientOptions?.configPath ? { configPath: clientOptions.configPath } : {}),
      ...(clientOptions?.passwordLoginPath ? { passwordLoginPath: clientOptions.passwordLoginPath } : {}),
      ...(clientOptions?.passwordSignupPath ? { passwordSignupPath: clientOptions.passwordSignupPath } : {}),
      ...(clientOptions?.magicLinkPath ? { magicLinkPath: clientOptions.magicLinkPath } : {}),
      ...(clientOptions?.oauthMode ? { oauthMode: clientOptions.oauthMode } : {}),
    }),
    [
      clientOptions?.baseUrl,
      clientOptions?.loginPath,
      clientOptions?.configPath,
      clientOptions?.passwordLoginPath,
      clientOptions?.passwordSignupPath,
      clientOptions?.magicLinkPath,
      clientOptions?.logoutPath,
      clientOptions?.profilePath,
      clientOptions?.oauthMode,
      props.baseUrl,
    ],
  );
  const [session, setSession] = useState<SsoSession<TUser> | null>(bootstrap?.session ?? null);
  const [metadata, setMetadata] = useState<SsoClientMetadata | null>(null);
  const [interactionMode, setInteractionMode] = useState(clientOptions?.interactionMode ?? "embedded");
  const [oauthMode, setOauthMode] = useState(clientOptions?.oauthMode ?? "popup");
  const [loading, setLoading] = useState(!bootstrap);
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
    let active = true;
    void Promise.all([client.getSession(), client.getConfig()])
      .then(([nextSession, config]) => {
        if (!active) return;
        setSession(nextSession);
        setMetadata(config.metadata);
        setInteractionMode(config.client?.interactionMode ?? "embedded");
        setOauthMode(config.client?.oauthMode ?? "popup");
        setError(null);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause : new Error("SSO initialization failed"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [client]);

  const signIn = useCallback(async (options?: SsoLoginOptions) => {
    setLoading(true);
    setError(null);
    try {
      await client.signIn(options);
      const nextSession = await client.getSession();
      setSession(nextSession);
      return nextSession;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO sign-in failed");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const signInWithPassword = useCallback(async (input: { email: string; password: string; returnTo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const nextSession = await client.signInWithPassword(input);
      setSession(nextSession);
      return nextSession;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO password sign-in failed");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const signUpWithPassword = useCallback(async (input: { name: string; email: string; password: string; returnTo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.signUpWithPassword(input);
      setSession(result.session);
      return result;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO password signup failed");
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

  const sendMagicLink = useCallback(async (input: { intent?: "signin" | "signup"; name?: string; email: string; returnTo?: string }) => {
    setLoading(true);
    setError(null);
    try {
      await client.sendMagicLink(input);
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error("SSO magic-link request failed");
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, [client]);

  const value = useMemo<SsoContextValue<TUser>>(() => ({
    session,
    status: loading ? "loading" : error ? "error" : session ? "authenticated" : "unauthenticated",
    error,
    metadata,
    interactionMode,
    oauthMode,
    login: client.login,
    signIn,
    signInWithPassword,
    signUpWithPassword,
    sendMagicLink,
    logout,
    refresh,
  }), [client.login, error, interactionMode, loading, logout, metadata, oauthMode, refresh, sendMagicLink, session, signIn, signInWithPassword, signUpWithPassword]);

  return createElement(
    SsoContext.Provider,
    { value: value as SsoContextValue<SsoUser> },
    props.children,
  );
}

export const SkycanvasProvider = SsoProvider;
export const SkyCanvasProvider = SsoProvider;

export function useSkycanvas<TUser extends SsoUser = SsoUser>() {
  const value = useOptionalSso<TUser>();
  if (!value) throw new Error("useSkycanvas requires SkycanvasProvider");
  return value;
}

export const useSkyCanvas = useSkycanvas;

export function useAuth<TUser extends SsoUser = SsoUser>() {
  const value = useSkycanvas<TUser>();
  return {
    isLoaded: value.status !== "loading",
    isSignedIn: value.status === "authenticated",
    userId: value.session?.user.id ?? null,
    session: value.session,
    signOut: value.logout,
  };
}

export function useUser<TUser extends SsoUser = SsoUser>() {
  const value = useSkycanvas<TUser>();
  return {
    isLoaded: value.status !== "loading",
    isSignedIn: value.status === "authenticated",
    user: value.session?.user ?? null,
  };
}

export function SignedIn({ children }: { children?: ReactNode }) {
  return useSkycanvas().status === "authenticated" ? createElement(Fragment, null, children) : null;
}

export function SignedOut({ children }: { children?: ReactNode }) {
  return useSkycanvas().status === "unauthenticated" ? createElement(Fragment, null, children) : null;
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
