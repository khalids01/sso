import type { SsoSession, SsoUser } from "../index.js";

export interface SsoClientOptions<TUser extends SsoUser = SsoUser> {
  baseUrl?: string;
  loginPath?: string;
  profilePath?: string;
  logoutPath?: string;
  fetch?: typeof fetch;
  navigate?: (url: string) => void;
}

export interface SsoClient<TUser extends SsoUser = SsoUser> {
  login: (returnTo?: string) => void;
  getSession: () => Promise<SsoSession<TUser> | null>;
  logout: () => Promise<void>;
}

export function createSsoClient<TUser extends SsoUser = SsoUser>(
  options: SsoClientOptions<TUser> = {},
): SsoClient<TUser> {
  const baseUrl = options.baseUrl;
  const loginPath = options.loginPath ?? "/auth/login";
  const profilePath = options.profilePath ?? "/auth/profile";
  const logoutPath = options.logoutPath ?? "/auth/logout";

  return {
    login(returnTo = "/") {
      const target = resolveUrl(loginPath, baseUrl);
      target.searchParams.set("returnTo", returnTo);
      const navigate = options.navigate ?? defaultNavigate;
      navigate(baseUrl ? target.toString() : `${target.pathname}${target.search}`);
    },
    async getSession() {
      const response = await getFetch(options.fetch)(resolveRequestUrl(profilePath, baseUrl), {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (response.status === 401) return null;
      if (!response.ok) throw await responseError(response, "session request");
      return response.json() as Promise<SsoSession<TUser>>;
    },
    async logout() {
      const response = await getFetch(options.fetch)(resolveRequestUrl(logoutPath, baseUrl), {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw await responseError(response, "logout");
    },
  };
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
