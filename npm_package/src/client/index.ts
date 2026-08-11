import type { SsoAuthMethod, SsoClientMetadata, SsoSession, SsoUser } from "../index.js";
import type { StandaloneSsoClientConfig } from "../server/index.js";

export interface SsoClientOptions<TUser extends SsoUser = SsoUser> {
  baseUrl?: string;
  loginPath?: string;
  configPath?: string;
  passwordLoginPath?: string;
  passwordSignupPath?: string;
  magicLinkPath?: string;
  profilePath?: string;
  logoutPath?: string;
  oauthMode?: "redirect" | "popup";
  fetch?: typeof fetch;
  navigate?: (url: string) => void;
  popupTimeoutMs?: number;
}

export interface SsoLoginOptions {
  returnTo?: string;
  forceLogin?: boolean;
  mode?: "redirect" | "popup";
  provider?: Extract<SsoAuthMethod, "google" | "facebook" | "linkedin" | "github">;
  intent?: "signin" | "signup";
}

export interface SsoLogoutOptions {
  global?: boolean;
  returnTo?: string;
}

export interface SsoClient<TUser extends SsoUser = SsoUser> {
  login: (returnToOrOptions?: string | SsoLoginOptions) => void;
  signIn: (options?: SsoLoginOptions) => Promise<void>;
  getConfig: () => Promise<{ client?: StandaloneSsoClientConfig; metadata: SsoClientMetadata }>;
  signInWithPassword: (input: { email: string; password: string; returnTo?: string }) => Promise<SsoSession<TUser> | null>;
  signUpWithPassword: (input: { name: string; email: string; password: string; returnTo?: string }) => Promise<{ session: SsoSession<TUser> | null; requiresEmailVerification: boolean }>;
  sendMagicLink: (input: { intent?: "signin" | "signup"; name?: string; email: string; returnTo?: string }) => Promise<void>;
  getSession: () => Promise<SsoSession<TUser> | null>;
  logout: (options?: SsoLogoutOptions) => Promise<void>;
}

export function createSsoClient<TUser extends SsoUser = SsoUser>(
  options: SsoClientOptions<TUser> = {},
): SsoClient<TUser> {
  const baseUrl = options.baseUrl;
  const loginPath = options.loginPath ?? "/auth/login";
  const configPath = options.configPath ?? "/auth/config";
  const passwordLoginPath = options.passwordLoginPath ?? "/auth/password/login";
  const passwordSignupPath = options.passwordSignupPath ?? "/auth/password/signup";
  const magicLinkPath = options.magicLinkPath ?? "/auth/magic-link";
  const profilePath = options.profilePath ?? "/auth/profile";
  const logoutPath = options.logoutPath ?? "/auth/logout";

  const buildLoginTarget = (loginOptions: SsoLoginOptions) => {
    const target = resolveUrl(loginPath, baseUrl);
    target.searchParams.set("returnTo", loginOptions.returnTo ?? "/");
    if (loginOptions.forceLogin) target.searchParams.set("forceLogin", "true");
    if (loginOptions.provider) target.searchParams.set("provider", loginOptions.provider);
    if (loginOptions.intent === "signup") target.searchParams.set("intent", "signup");
    return target;
  };

  const signIn = async (loginOptions: SsoLoginOptions = {}) => {
    const mode = loginOptions.mode ?? options.oauthMode ?? "redirect";
    const target = buildLoginTarget(loginOptions);
    if (mode === "popup") {
      target.searchParams.set("popup", "true");
      await popupSignIn(
        baseUrl ? target.toString() : `${target.pathname}${target.search}`,
        options.popupTimeoutMs,
      );
      return;
    }
    const navigate = options.navigate ?? defaultNavigate;
    navigate(baseUrl ? target.toString() : `${target.pathname}${target.search}`);
  };

  const completeEmbeddedAuthorization = async (redirectUrl: string) => {
    const callback = new URL(redirectUrl);
    const expectedOrigin = baseUrl
      ? new URL(baseUrl).origin
      : typeof window === "undefined"
        ? undefined
        : window.location.origin;
    if (expectedOrigin && callback.origin !== expectedOrigin) {
      throw new Error("SSO embedded callback returned an unexpected origin");
    }
    const response = await getFetch(options.fetch)(callback.toString(), {
      credentials: "include",
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) throw await responseError(response, "embedded callback");
  };

  const passwordRequest = async (path: string, input: Record<string, string>) => {
    const response = await getFetch(options.fetch)(resolveRequestUrl(path, baseUrl), {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json().catch(() => null) as {
      redirectUrl?: string;
      requiresEmailVerification?: boolean;
      error?: string;
      message?: string;
    } | null;
    if (!response.ok) {
      throw new Error(result?.message ?? result?.error ?? `SSO authentication failed (${response.status})`);
    }
    if (result?.redirectUrl) await completeEmbeddedAuthorization(result.redirectUrl);
    return result;
  };

  const getSession = async () => {
    const response = await getFetch(options.fetch)(resolveRequestUrl(profilePath, baseUrl), {
      credentials: "include",
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (response.status === 401) return null;
    if (!response.ok) throw await responseError(response, "session request");
    return response.json() as Promise<SsoSession<TUser>>;
  };

  return {
    login(returnToOrOptions: string | SsoLoginOptions = "/") {
      const loginOptions = typeof returnToOrOptions === "string"
        ? { returnTo: returnToOrOptions }
        : returnToOrOptions;
      void signIn(loginOptions);
    },
    signIn,
    async getConfig() {
      const response = await getFetch(options.fetch)(resolveRequestUrl(configPath, baseUrl), {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw await responseError(response, "configuration request");
      return response.json() as Promise<{ client?: StandaloneSsoClientConfig; metadata: SsoClientMetadata }>;
    },
    async signInWithPassword(input) {
      const result = await passwordRequest(passwordLoginPath, {
        email: input.email,
        password: input.password,
        returnTo: input.returnTo ?? "/",
      });
      if (!result?.redirectUrl) throw new Error("SSO password sign-in did not complete");
      return getSession();
    },
    async signUpWithPassword(input) {
      const result = await passwordRequest(passwordSignupPath, {
        name: input.name,
        email: input.email,
        password: input.password,
        returnTo: input.returnTo ?? "/",
      });
      if (result?.requiresEmailVerification) {
        return { session: null, requiresEmailVerification: true };
      }
      if (!result?.redirectUrl) throw new Error("SSO password signup did not complete");
      return { session: await getSession(), requiresEmailVerification: false };
    },
    async sendMagicLink(input) {
      const response = await getFetch(options.fetch)(resolveRequestUrl(magicLinkPath, baseUrl), {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          intent: input.intent ?? "signin",
          email: input.email,
          returnTo: input.returnTo ?? "/",
          ...(input.name ? { name: input.name } : {}),
        }),
      });
      if (!response.ok) throw await responseError(response, "magic-link request");
    },
    getSession,
    async logout(logoutOptions = {}) {
      if (logoutOptions.global !== false) {
        const target = resolveUrl(logoutPath, baseUrl);
        target.searchParams.set("global", "true");
        target.searchParams.set("returnTo", logoutOptions.returnTo ?? "/");
        const navigate = options.navigate ?? defaultNavigate;
        navigate(baseUrl ? target.toString() : `${target.pathname}${target.search}`);
        return;
      }
      const response = await getFetch(options.fetch)(resolveRequestUrl(logoutPath, baseUrl), {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw await responseError(response, "logout");
    },
  };
}

async function popupSignIn(url: string, timeoutMs = 10 * 60_000): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("SSO popup sign-in requires a browser");
  }
  const popupUrl = new URL(url, window.location.href);
  const expectedMessageOrigin = popupUrl.origin;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - 520) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - 720) / 2));
  const popup = window.open(
    popupUrl.toString(),
    "skycanvas-sso",
    `popup=yes,width=520,height=720,left=${left},top=${top}`,
  );
  if (!popup) {
    window.location.assign(url.replace(/([?&])popup=true(&|$)/, "$1").replace(/[?&]$/, ""));
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error("SSO popup timed out")), timeoutMs);
    const poll = window.setInterval(() => {
      if (popup.closed) finish(new Error("SSO popup was closed"));
    }, 400);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== expectedMessageOrigin) return;
      if (event.source !== popup) return;
      if (event.data?.type !== "skycanvas:sso:complete") return;
      if (event.data?.error) {
        finish(new Error(
          typeof event.data.message === "string"
            ? event.data.message
            : "SSO authentication failed",
        ));
        return;
      }
      finish();
    };
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
      if (!popup.closed) popup.close();
      error ? reject(error) : resolve();
    };
    window.addEventListener("message", onMessage);
  });
}

function defaultNavigate(url: string): void {
  if (typeof window === "undefined") throw new Error("SSO login requires a browser or a custom navigate function");
  window.location.assign(url);
}

function getFetch(customFetch: typeof fetch | undefined): typeof fetch {
  const request = customFetch ?? globalThis.fetch;
  if (!request) throw new Error("SSO requires fetch in this environment");
  return request;
}

function resolveRequestUrl(path: string, baseUrl: string | undefined): string {
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

function resolveUrl(path: string, baseUrl: string | undefined): URL {
  if (baseUrl) return new URL(path, baseUrl);
  if (typeof window === "undefined") return new URL(path, "http://localhost");
  return new URL(path, window.location.origin);
}

async function responseError(response: Response, action: string): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  const detail = typeof body?.error === "string" ? `: ${body.error}` : "";
  return new Error(`SSO ${action} failed (${response.status})${detail}`);
}
