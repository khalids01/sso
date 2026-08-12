import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";

import {
  SSO_SCOPE,
  getSsoEndpoints,
  safeReturnTo,
  type SsoClientMetadata,
  type SsoSession,
  type SsoTokenResponse,
  type SsoUser,
} from "../index.js";
import type {
  SsoClient,
  SsoLoginOptions,
  SsoLogoutOptions,
} from "./index.js";

export interface BrowserSsoClientOptions<TUser extends SsoUser = SsoUser> {
  publishableKey: string;
  ssoUrl?: string;
  redirectUrl?: string;
  oauthMode?: "redirect" | "popup";
  fetch?: typeof fetch;
  navigate?: (url: string) => void;
  popupTimeoutMs?: number;
  tokenCache?: "memory" | "session";
  mapUser?: (user: SsoUser) => TUser;
}

type BrowserFlow = {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
};

type BrowserSession<TUser extends SsoUser> = {
  session: SsoSession<TUser>;
  accessToken: string;
  idToken: string;
};

type OAuthCallbackMessage = {
  type: "skycanvas:sso:oauth-callback";
  code?: string;
  state?: string;
  error?: string;
  message?: string;
};

/**
 * Public-client integration for React-only applications. Tokens are scoped to
 * the registered application and cached in memory (or sessionStorage), while
 * the SkyCanvas server owns the identity-provider callbacks and token issuer.
 */
export function createBrowserSsoClient<TUser extends SsoUser = SsoUser>(
  options: BrowserSsoClientOptions<TUser>,
): SsoClient<TUser> {
  if (!options.publishableKey.trim()) throw new Error("SkyCanvas publishableKey is required");
  const endpoints = getSsoEndpoints(options.ssoUrl);
  const ssoOrigin = new URL(options.ssoUrl ?? endpoints.authorization).origin;
  const request = options.fetch ?? globalThis.fetch;
  if (!request) throw new Error("SkyCanvas browser auth requires fetch");
  const cacheKey = `skycanvas:${options.publishableKey}:session`;
  const flowKey = `skycanvas:${options.publishableKey}:flow`;
  let current: BrowserSession<TUser> | null = null;
  let metadata: SsoClientMetadata | null = null;
  const syncChannel = typeof window !== "undefined" && typeof window.BroadcastChannel === "function"
    ? new window.BroadcastChannel(`skycanvas:${options.publishableKey}:auth`)
    : null;

  const getRedirectUri = () => {
    if (options.redirectUrl) return new URL(options.redirectUrl).toString();
    if (typeof window === "undefined") {
      throw new Error("SkyCanvas redirectUrl is required outside a browser");
    }
    return new URL("/auth/callback", window.location.origin).toString();
  };

  const storeFlow = (flow: BrowserFlow | null) => writeFlowValue(flowKey, flow);
  const readFlow = () => readFlowValue<BrowserFlow>(flowKey);
  const storeSession = (value: BrowserSession<TUser> | null) => {
    current = value;
    if ((options.tokenCache ?? "session") === "session") {
      writeSessionValue(cacheKey, value);
    }
  };

  const getMetadata = async () => {
    if (metadata) return metadata;
    const response = await request(endpoints.clientMetadata(options.publishableKey), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`SkyCanvas configuration request failed (${response.status})`);
    metadata = await response.json() as SsoClientMetadata;
    return metadata;
  };

  const verifyTokens = async (
    tokens: Pick<SsoTokenResponse, "access_token" | "id_token">,
    nonce?: string,
  ): Promise<BrowserSession<TUser>> => {
    const [clientMetadata, jwksResponse] = await Promise.all([
      getMetadata(),
      request(endpoints.jwks, { cache: "no-store", headers: { accept: "application/json" } }),
    ]);
    if (!jwksResponse.ok) throw new Error(`SkyCanvas JWKS request failed (${jwksResponse.status})`);
    const keySet = createLocalJWKSet(await jwksResponse.json() as JSONWebKeySet);
    const [access, identity] = await Promise.all([
      jwtVerify(tokens.access_token, keySet, {
        issuer: clientMetadata.issuer,
        audience: clientMetadata.audience,
      }),
      jwtVerify(tokens.id_token, keySet, {
        issuer: clientMetadata.issuer,
        audience: options.publishableKey,
      }),
    ]);
    if (!access.payload.sub || access.payload.sub !== identity.payload.sub) {
      throw new Error("SkyCanvas token subject mismatch");
    }
    if (nonce !== undefined && identity.payload.nonce !== nonce) {
      throw new Error("SkyCanvas nonce mismatch");
    }
    const expiresAt = Math.min(
      Number(access.payload.exp ?? 0),
      Number(identity.payload.exp ?? 0),
    ) * 1_000;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error("SkyCanvas session expired");
    }
    const baseUser = claimsToUser(identity.payload);
    return {
      session: {
        user: options.mapUser ? options.mapUser(baseUser) : baseUser as TUser,
        expiresAt,
      },
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
    };
  };

  const exchange = async (code: string, flow: BrowserFlow) => {
    const response = await request(endpoints.token, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: options.publishableKey,
        redirect_uri: flow.redirectUri,
        code,
        code_verifier: flow.verifier,
      }),
    });
    if (!response.ok) throw new Error(`SkyCanvas token exchange failed (${response.status})`);
    const tokens = await response.json() as SsoTokenResponse;
    const next = await verifyTokens(tokens, flow.nonce);
    storeSession(next);
    storeFlow(null);
    syncChannel?.postMessage({
      type: "skycanvas:sso:session",
      accessToken: next.accessToken,
      idToken: next.idToken,
    });
    return next.session;
  };

  if (syncChannel) {
    syncChannel.onmessage = (event: MessageEvent<{
      type?: string;
      accessToken?: string;
      idToken?: string;
    }>) => {
      if (
        event.data?.type !== "skycanvas:sso:session" ||
        typeof event.data.accessToken !== "string" ||
        typeof event.data.idToken !== "string"
      ) return;
      void verifyTokens({
        access_token: event.data.accessToken,
        id_token: event.data.idToken,
      }).then((next) => {
        storeSession(next);
        window.dispatchEvent(new Event("skycanvas:sso:session"));
      }).catch(() => undefined);
    };
  }

  const makeAuthorization = async (loginOptions: SsoLoginOptions) => {
    const verifier = randomBase64Url(48);
    // Better Auth signs and forwards the standard OIDC nonce but drops unknown
    // authorization parameters. Encode a selected provider in the nonce so the
    // central login page can safely start that provider after the redirect.
    const nonce = loginOptions.provider
      ? `skycanvas-provider-${loginOptions.provider}-${randomBase64Url(24)}`
      : randomBase64Url(24);
    const flow: BrowserFlow = {
      state: randomBase64Url(24),
      nonce,
      verifier,
      redirectUri: getRedirectUri(),
      returnTo: safeReturnTo(loginOptions.returnTo),
      createdAt: Date.now(),
    };
    const url = new URL(endpoints.authorization);
    url.search = new URLSearchParams({
      client_id: options.publishableKey,
      redirect_uri: flow.redirectUri,
      response_type: "code",
      scope: SSO_SCOPE,
      state: flow.state,
      nonce: flow.nonce,
      code_challenge_method: "S256",
      code_challenge: await sha256Base64Url(verifier),
      ...(
        loginOptions.forceLogin || (loginOptions.provider && loginOptions.intent !== "signup")
          ? { prompt: "login" }
          : loginOptions.intent === "signup"
            ? { prompt: "create" }
            : {}
      ),
    }).toString();
    storeFlow(flow);
    return { flow, url, challenge: url.searchParams.get("code_challenge")! };
  };

  const embeddedRequest = async (
    path: string,
    input: Record<string, string>,
    intent: "signin" | "signup",
  ) => {
    if (typeof window === "undefined") throw new Error("SkyCanvas embedded auth requires a browser");
    const body = { ...input };
    delete body.returnTo;
    const { flow, challenge } = await makeAuthorization({
      intent,
      ...(input.returnTo ? { returnTo: input.returnTo } : {}),
    });
    const response = await request(new URL(path, ssoOrigin), {
      method: "POST",
      credentials: "include",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        clientId: options.publishableKey,
        redirectUri: flow.redirectUri,
        origin: window.location.origin,
        state: flow.state,
        nonce: flow.nonce,
        codeChallenge: challenge,
        ...body,
      }),
    });
    const result = await response.json().catch(() => null) as {
      redirectUrl?: string;
      requiresEmailVerification?: boolean;
      error?: string;
      message?: string;
    } | null;
    if (!response.ok) {
      storeFlow(null);
      throw new Error(result?.message ?? result?.error ?? `SkyCanvas authentication failed (${response.status})`);
    }
    return { flow, result };
  };

  const completeEmbeddedAuthorization = async (redirectUrl: string, flow: BrowserFlow) => {
    const callback = new URL(redirectUrl);
    if (callback.origin !== new URL(flow.redirectUri).origin) {
      throw new Error("SkyCanvas embedded callback returned an unexpected origin");
    }
    const state = callback.searchParams.get("state");
    const code = callback.searchParams.get("code");
    if (state !== flow.state || !code) {
      throw new Error("SkyCanvas embedded authorization response is invalid");
    }
    return exchange(code, flow);
  };

  const completeRedirect = async () => {
    if (typeof window === "undefined") return null;
    const callback = new URL(window.location.href);
    const state = callback.searchParams.get("state");
    const code = callback.searchParams.get("code");
    const error = callback.searchParams.get("error");
    if (!state || (!code && !error)) return null;

    if (window.opener) {
      const message: OAuthCallbackMessage = {
        type: "skycanvas:sso:oauth-callback",
        state,
        ...(code ? { code } : {}),
        ...(error ? {
          error,
          message: callback.searchParams.get("error_description") ?? "SkyCanvas authentication failed",
        } : {}),
      };
      window.opener.postMessage(message, window.location.origin);
      window.close();
      return null;
    }

    const flow = readFlow();
    if (!flow || flow.state !== state || Date.now() - flow.createdAt > 10 * 60_000) {
      storeFlow(null);
      throw new Error("SkyCanvas authorization state is invalid or expired");
    }
    if (error || !code) {
      storeFlow(null);
      throw new Error(callback.searchParams.get("error_description") ?? "SkyCanvas authentication was denied");
    }
    const session = await exchange(code, flow);
    window.history.replaceState({}, "", flow.returnTo);
    return session;
  };

  const restoreSession = async () => {
    if (current?.session.expiresAt && current.session.expiresAt > Date.now()) return current.session;
    const cached = (options.tokenCache ?? "session") === "session"
      ? readSessionValue<BrowserSession<TUser>>(cacheKey)
      : null;
    if (!cached) return null;
    try {
      const verified = await verifyTokens({
        access_token: cached.accessToken,
        id_token: cached.idToken,
      });
      storeSession(verified);
      return verified.session;
    } catch {
      storeSession(null);
      return null;
    }
  };

  const signIn = async (loginOptions: SsoLoginOptions = {}) => {
    if (typeof window === "undefined") throw new Error("SkyCanvas sign-in requires a browser");
    const { flow, url } = await makeAuthorization(loginOptions);
    const mode = loginOptions.mode ?? options.oauthMode ?? "popup";
    if (mode === "redirect") {
      (options.navigate ?? ((target) => window.location.assign(target)))(url.toString());
      return;
    }
    const result = await popupAuthorization(url.toString(), flow, options.popupTimeoutMs);
    await exchange(result.code, flow);
  };

  const logout = async (logoutOptions: SsoLogoutOptions = {}) => {
    storeSession(null);
    storeFlow(null);
    if (logoutOptions.global === false) return;
    if (typeof window === "undefined") return;
    const url = new URL(endpoints.globalLogout);
    url.searchParams.set("client_id", options.publishableKey);
    url.searchParams.set(
      "return_to",
      new URL(safeReturnTo(logoutOptions.returnTo), window.location.origin).toString(),
    );
    (options.navigate ?? ((target) => window.location.assign(target)))(url.toString());
  };

  return {
    login(returnToOrOptions: string | SsoLoginOptions = "/") {
      void signIn(typeof returnToOrOptions === "string"
        ? { returnTo: returnToOrOptions }
        : returnToOrOptions);
    },
    signIn,
    async getConfig() {
      return {
        client: {
          baseUrl: ssoOrigin,
          loginPath: new URL(endpoints.authorization).pathname,
          profilePath: "",
          logoutPath: new URL(endpoints.globalLogout).pathname,
          interactionMode: "embedded" as const,
          oauthMode: options.oauthMode ?? "popup",
        },
        metadata: await getMetadata(),
      };
    },
    async signInWithPassword(input) {
      const { flow, result } = await embeddedRequest(
        "/auth/sdk/password/login",
        { email: input.email, password: input.password, returnTo: input.returnTo ?? "/" },
        "signin",
      );
      if (!result?.redirectUrl) throw new Error("SkyCanvas password sign-in did not complete");
      return completeEmbeddedAuthorization(result.redirectUrl, flow);
    },
    async signUpWithPassword(input) {
      const { flow, result } = await embeddedRequest(
        "/auth/sdk/password/signup",
        {
          name: input.name,
          email: input.email,
          password: input.password,
          returnTo: input.returnTo ?? "/",
        },
        "signup",
      );
      if (result?.requiresEmailVerification) {
        storeFlow(null);
        return { session: null, requiresEmailVerification: true };
      }
      if (!result?.redirectUrl) throw new Error("SkyCanvas password signup did not complete");
      return {
        session: await completeEmbeddedAuthorization(result.redirectUrl, flow),
        requiresEmailVerification: false,
      };
    },
    async sendMagicLink(input) {
      await embeddedRequest(
        "/auth/sdk/magic-link",
        {
          intent: input.intent ?? "signin",
          email: input.email,
          returnTo: input.returnTo ?? "/",
          ...(input.name ? { name: input.name } : {}),
        },
        input.intent === "signup" ? "signup" : "signin",
      );
    },
    async requestPasswordReset(input) {
      if (typeof window === "undefined") throw new Error("SkyCanvas password reset requires a browser");
      const response = await request(new URL("/auth/sdk/password/request-reset", ssoOrigin), {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({
          clientId: options.publishableKey,
          redirectUri: getRedirectUri(),
          origin: window.location.origin,
          email: input.email,
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message ?? "Could not request a password reset");
      }
    },
    async getSession() {
      return await completeRedirect() ?? await restoreSession();
    },
    async getToken() {
      const session = await restoreSession();
      return session ? current?.accessToken ?? null : null;
    },
    logout,
  };
}

async function popupAuthorization(
  url: string,
  flow: BrowserFlow,
  timeoutMs = 10 * 60_000,
): Promise<{ code: string }> {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - 520) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - 720) / 2));
  const popup = window.open(url, "skycanvas-sso", `popup=yes,width=520,height=720,left=${left},top=${top}`);
  if (!popup) {
    window.location.assign(url);
    return new Promise(() => undefined);
  }
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error("SkyCanvas popup timed out")), timeoutMs);
    const poll = window.setInterval(() => {
      if (popup.closed) finish(new Error("SkyCanvas popup was closed"));
    }, 400);
    const onMessage = (event: MessageEvent<OAuthCallbackMessage>) => {
      if (event.origin !== new URL(flow.redirectUri).origin || event.source !== popup) return;
      if (event.data?.type !== "skycanvas:sso:oauth-callback" || event.data.state !== flow.state) return;
      if (event.data.error || !event.data.code) {
        finish(new Error(event.data.message ?? "SkyCanvas authentication failed"));
      } else {
        finish(undefined, event.data.code);
      }
    };
    const finish = (error?: Error, code?: string) => {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener("message", onMessage);
      if (!popup.closed) popup.close();
      if (error) reject(error);
      else if (code) resolve({ code });
    };
    window.addEventListener("message", onMessage);
  });
}

function claimsToUser(claims: Record<string, unknown>): SsoUser {
  if (
    typeof claims.sub !== "string" ||
    typeof claims.email !== "string" ||
    typeof claims.name !== "string"
  ) {
    throw new Error("SkyCanvas ID token is missing required user claims");
  }
  return {
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    image: typeof claims.picture === "string" ? claims.picture : null,
  };
}

function randomBase64Url(bytes: number) {
  const value = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

async function sha256Base64Url(value: string) {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function bytesToBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function readSessionValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in privacy modes; memory auth still works.
  }
}

function readFlowValue<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return readSessionValue<T>(key);
  }
}

function writeFlowValue(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    window.sessionStorage.removeItem(key);
  } catch {
    writeSessionValue(key, value);
  }
}
