import type { FreeSsoSession, FreeSsoUser } from "../index.js";

export interface FreeSsoClientOptions<TUser extends FreeSsoUser = FreeSsoUser> {
  baseUrl?: string;
  loginPath?: string;
  profilePath?: string;
  logoutPath?: string;
  fetch?: typeof fetch;
  navigate?: (url: string) => void;
}

export interface FreeSsoClient<TUser extends FreeSsoUser = FreeSsoUser> {
  login: (returnTo?: string) => void;
  getSession: () => Promise<FreeSsoSession<TUser> | null>;
  logout: () => Promise<void>;
}

export function createFreeSsoClient<TUser extends FreeSsoUser = FreeSsoUser>(
  options: FreeSsoClientOptions<TUser> = {},
): FreeSsoClient<TUser> {
  const baseUrl = options.baseUrl;
  const loginPath = options.loginPath ?? "/auth/login";
  const profilePath = options.profilePath ?? "/auth/profile";
  const logoutPath = options.logoutPath ?? "/auth/logout";

  return {
    login(returnTo = "/") {
      const target = resolveUrl(loginPath, baseUrl);
      target.searchParams.set("returnTo", returnTo);
      const navigate = options.navigate ?? ((url: string) => window.location.assign(url));
      navigate(baseUrl ? target.toString() : `${target.pathname}${target.search}`);
    },
    async getSession() {
      const response = await getFetch(options.fetch)(resolveRequestUrl(profilePath, baseUrl), {
        credentials: "include",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error(`Free SSO session request failed (${response.status})`);
      return response.json() as Promise<FreeSsoSession<TUser>>;
    },
    async logout() {
      const response = await getFetch(options.fetch)(resolveRequestUrl(logoutPath, baseUrl), {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Free SSO logout failed (${response.status})`);
    },
  };
}

function getFetch(customFetch: typeof fetch | undefined): typeof fetch {
  const request = customFetch ?? globalThis.fetch;
  if (!request) throw new Error("Free SSO requires fetch in this environment");
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
