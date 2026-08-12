import { expect, test } from "bun:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createBrowserSsoClient, createSsoClient } from "../src/client/index.js";

test("browser client uses local session endpoints with credentials", async () => {
  const requests: Array<{ input: string; init?: RequestInit }> = [];
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), ...(init ? { init } : {}) });
      return Response.json({
        user: { id: "1", name: "Khalid", email: "k@example.com", emailVerified: true, image: null },
        expiresAt: Date.now() + 60_000,
      });
    }) as typeof fetch,
  });

  const session = await client.getSession();
  expect(session?.user.id).toBe("1");
  expect(requests[0]?.input).toBe("https://app.example.com/auth/profile");
  expect(requests[0]?.init?.credentials).toBe("include");
});

test("browser client redirects through the local login route", () => {
  let destination = "";
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    navigate: (url) => { destination = url; },
  });

  client.login("/dashboard");
  expect(destination).toBe("https://app.example.com/auth/login?returnTo=%2Fdashboard");
});

test("browser client can request fresh authentication", () => {
  let destination = "";
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    navigate: (url) => { destination = url; },
  });

  client.login({ returnTo: "/dashboard", forceLogin: true });
  expect(destination).toBe(
    "https://app.example.com/auth/login?returnTo=%2Fdashboard&forceLogin=true",
  );
});

test("browser client can select a social provider without configuring provider callbacks", () => {
  let destination = "";
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    navigate: (url) => { destination = url; },
  });

  client.login({ returnTo: "/dashboard", provider: "github" });
  expect(destination).toBe(
    "https://app.example.com/auth/login?returnTo=%2Fdashboard&provider=github",
  );
});

test("browser client starts an embedded magic link through the local app", async () => {
  let request: { input: string; init?: RequestInit } | undefined;
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    fetch: (async (input: string | URL | Request, init?: RequestInit) => {
      request = { input: String(input), ...(init ? { init } : {}) };
      return Response.json({ success: true });
    }) as typeof fetch,
  });

  await client.sendMagicLink({ email: "user@example.com", returnTo: "/dashboard" });
  expect(request?.input).toBe("https://app.example.com/auth/magic-link");
  expect(request?.init?.credentials).toBe("include");
  expect(JSON.parse(String(request?.init?.body))).toEqual({
    intent: "signin",
    email: "user@example.com",
    returnTo: "/dashboard",
  });
});

test("browser client maps unauthorized profile responses to no session", async () => {
  const client = createSsoClient({
    fetch: (async () => new Response(null, { status: 401 })) as unknown as typeof fetch,
  });

  expect(await client.getSession()).toBeNull();
});

test("browser client can explicitly keep logout local", async () => {
  let requestInit: RequestInit | undefined;
  const client = createSsoClient({
    fetch: (async (_input: string | URL | Request, init?: RequestInit) => {
      requestInit = init;
      return new Response(null, { status: 204 });
    }) as typeof fetch,
  });

  await client.logout({ global: false });
  expect(requestInit?.method).toBe("POST");
  expect(requestInit?.credentials).toBe("include");
});

test("browser client uses top-level navigation for global logout by default", async () => {
  let destination = "";
  const client = createSsoClient({
    baseUrl: "https://app.example.com",
    navigate: (url) => { destination = url; },
  });

  await client.logout({ returnTo: "/signed-out" });
  expect(destination).toBe(
    "https://app.example.com/auth/logout?global=true&returnTo=%2Fsigned-out",
  );
});

test("popup sign-in accepts completion from a separate auth-route origin", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  try {
    const client = createSsoClient({
      baseUrl: "https://auth-api.example.com",
      oauthMode: "popup",
      popupTimeoutMs: 1_000,
    });
    const pending = client.signIn({ returnTo: "/dashboard" });
    browser.complete("https://auth-api.example.com", {
      type: "skycanvas:sso:complete",
      returnTo: "/dashboard",
    });
    await pending;

    expect(browser.openedUrl).toContain("https://auth-api.example.com/auth/login");
    expect(browser.openedUrl).toContain("popup=true");
    expect(browser.popup.closed).toBe(true);
  } finally {
    browser.restore();
  }
});

test("popup sign-in surfaces callback errors", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  try {
    const client = createSsoClient({
      baseUrl: "https://auth-api.example.com",
      oauthMode: "popup",
      popupTimeoutMs: 1_000,
    });
    const pending = client.signIn();
    browser.complete("https://auth-api.example.com", {
      type: "skycanvas:sso:complete",
      error: "authentication_failed",
      message: "Access was denied",
    });

    await expect(pending).rejects.toThrow("Access was denied");
  } finally {
    browser.restore();
  }
});

test("React-only client completes PKCE in a popup and exposes an app access token", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig", kid: "browser-key" };
  let issuedAccessToken = "";
  try {
    const request = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/oauth/client-metadata") {
        return Response.json({
          client_id: "client_browser",
          application_id: "app_browser",
          audience: "urn:sso:application:app_browser",
          issuer: "https://sso.example.com",
          sign_in_methods: ["password"],
          sign_up_methods: [],
        });
      }
      if (url.pathname === "/api/auth/jwks") return Response.json({ keys: [jwk] });
      if (url.pathname === "/api/auth/oauth2/token") {
        const params = new URLSearchParams(String(init?.body));
        expect(params.get("code_verifier")?.length).toBeGreaterThanOrEqual(43);
        const authorization = new URL(browser.openedUrl);
        const nonce = authorization.searchParams.get("nonce")!;
        issuedAccessToken = await browserToken(privateKey, {
          audience: "urn:sso:application:app_browser",
        });
        const idToken = await browserToken(privateKey, {
          audience: "client_browser",
          claims: {
            nonce,
            name: "Browser User",
            email: "browser@example.com",
            email_verified: true,
          },
        });
        return Response.json({
          access_token: issuedAccessToken,
          id_token: idToken,
          token_type: "Bearer",
          expires_in: 600,
          scope: "openid",
        });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    const client = createBrowserSsoClient({
      publishableKey: "client_browser",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      fetch: request,
      popupTimeoutMs: 1_000,
    });

    expect((await client.getConfig()).client?.interactionMode).toBe("embedded");

    const pending = client.signIn({ returnTo: "/protected" });
    await waitFor(() => Boolean(browser.openedUrl));
    const authorization = new URL(browser.openedUrl);
    expect(authorization.origin).toBe("https://sso.example.com");
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authorization.searchParams.get("prompt")).toBeNull();
    browser.complete("https://frontend.example.com", {
      type: "skycanvas:sso:oauth-callback",
      code: "browser_authorization_code",
      state: authorization.searchParams.get("state"),
    });
    await pending;

    expect((await client.getSession())?.user.email).toBe("browser@example.com");
    expect(await client.getToken()).toBe(issuedAccessToken);
  } finally {
    browser.restore();
  }
});

test("React-only social buttons carry the selected provider through the signed OIDC nonce", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  try {
    const client = createBrowserSsoClient({
      publishableKey: "client_social",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      popupTimeoutMs: 1_000,
    });
    const pending = client.signIn({ provider: "google" });
    await waitFor(() => Boolean(browser.openedUrl));
    const authorization = new URL(browser.openedUrl);

    expect(authorization.searchParams.get("provider")).toBeNull();
    expect(authorization.searchParams.get("nonce")).toMatch(/^skycanvas-provider-google-[A-Za-z0-9_-]{16,}$/);
    expect(authorization.searchParams.get("prompt")).toBeNull();
    browser.complete("https://frontend.example.com", {
      type: "skycanvas:sso:oauth-callback",
      state: authorization.searchParams.get("state"),
      error: "access_denied",
      message: "Test completed",
    });
    await expect(pending).rejects.toThrow("Test completed");
  } finally {
    browser.restore();
  }
});

test("React-only client only requests fresh authentication explicitly", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  try {
    const client = createBrowserSsoClient({
      publishableKey: "client_fresh_login",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      popupTimeoutMs: 1_000,
    });
    const pending = client.signIn({ provider: "github", forceLogin: true });
    await waitFor(() => Boolean(browser.openedUrl));
    const authorization = new URL(browser.openedUrl);

    expect(authorization.searchParams.get("prompt")).toBe("login");
    browser.complete("https://frontend.example.com", {
      type: "skycanvas:sso:oauth-callback",
      state: authorization.searchParams.get("state"),
      error: "access_denied",
      message: "Test completed",
    });
    await expect(pending).rejects.toThrow("Test completed");
  } finally {
    browser.restore();
  }
});

test("React-only client coalesces concurrent popup starts", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  try {
    const client = createBrowserSsoClient({
      publishableKey: "client_single_popup",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      popupTimeoutMs: 1_000,
    });
    const first = client.signIn({ provider: "google" });
    const second = client.signIn({ provider: "github" });
    expect(second).toBe(first);
    await waitFor(() => Boolean(browser.openedUrl));
    const authorization = new URL(browser.openedUrl);
    expect(authorization.searchParams.get("nonce")).toContain("skycanvas-provider-google-");

    browser.complete("https://frontend.example.com", {
      type: "skycanvas:sso:oauth-callback",
      state: authorization.searchParams.get("state"),
      error: "access_denied",
      message: "Test completed",
    });
    await expect(first).rejects.toThrow("Test completed");
  } finally {
    browser.restore();
  }
});

test("React-only client completes embedded password auth without opening a popup", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig", kid: "password-key" };
  const captured: { body: Record<string, string> | null; init?: RequestInit } = { body: null };
  try {
    const request = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/oauth/client-metadata") {
        return Response.json({
          client_id: "client_password",
          application_id: "app_password",
          audience: "urn:sso:application:app_password",
          issuer: "https://sso.example.com",
          sign_in_methods: ["password", "magic_link", "google"],
          sign_up_methods: ["password"],
        });
      }
      if (url.pathname === "/auth/sdk/password/login") {
        if (init) captured.init = init;
        const body = JSON.parse(String(init?.body)) as Record<string, string>;
        captured.body = body;
        const callback = new URL(body.redirectUri!);
        callback.searchParams.set("code", "password_authorization_code");
        callback.searchParams.set("state", body.state!);
        return Response.json({ redirectUrl: callback.toString() });
      }
      if (url.pathname === "/api/auth/jwks") return Response.json({ keys: [jwk] });
      if (url.pathname === "/api/auth/oauth2/token") {
        const embeddedBody = captured.body;
        if (!embeddedBody) return new Response(null, { status: 500 });
        const accessToken = await new SignJWT({ scope: "openid" })
          .setProtectedHeader({ alg: "RS256", kid: "password-key" })
          .setIssuer("https://sso.example.com")
          .setAudience("urn:sso:application:app_password")
          .setSubject("password_user")
          .setIssuedAt()
          .setExpirationTime("10m")
          .sign(privateKey);
        const idToken = await new SignJWT({
          nonce: embeddedBody.nonce,
          name: "Password User",
          email: "password@example.com",
          email_verified: true,
        })
          .setProtectedHeader({ alg: "RS256", kid: "password-key" })
          .setIssuer("https://sso.example.com")
          .setAudience("client_password")
          .setSubject("password_user")
          .setIssuedAt()
          .setExpirationTime("10m")
          .sign(privateKey);
        return Response.json({
          access_token: accessToken,
          id_token: idToken,
          token_type: "Bearer",
          expires_in: 600,
          scope: "openid",
        });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    const client = createBrowserSsoClient({
      publishableKey: "client_password",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      fetch: request,
    });

    const session = await client.signInWithPassword({
      email: "password@example.com",
      password: "correct horse battery staple",
      returnTo: "/protected",
    });

    expect(session?.user.email).toBe("password@example.com");
    expect(captured.body?.origin).toBe("https://frontend.example.com");
    expect(captured.body?.codeChallenge).toHaveLength(43);
    expect(captured.init?.credentials).toBe("include");
    expect(browser.openedUrl).toBe("");
  } finally {
    browser.restore();
  }
});

test("React-only client requests a password reset through the central registered-origin endpoint", async () => {
  const browser = installPopupBrowser("https://frontend.example.com");
  const captured: { requestBody?: Record<string, string> } = {};
  try {
    const request = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/auth/sdk/password/request-reset") {
        captured.requestBody = JSON.parse(String(init?.body));
        return Response.json({ success: true });
      }
      return new Response(null, { status: 404 });
    }) as typeof fetch;
    const client = createBrowserSsoClient({
      publishableKey: "client_password",
      ssoUrl: "https://sso.example.com",
      redirectUrl: "https://frontend.example.com/auth/callback",
      fetch: request,
    });

    await client.requestPasswordReset({ email: "user@example.com" });

    expect(captured.requestBody).toEqual({
      clientId: "client_password",
      redirectUri: "https://frontend.example.com/auth/callback",
      origin: "https://frontend.example.com",
      email: "user@example.com",
    });
  } finally {
    browser.restore();
  }
});

async function browserToken(
  privateKey: CryptoKey,
  input: { audience: string; claims?: Record<string, unknown> },
) {
  return new SignJWT(input.claims ?? {})
    .setProtectedHeader({ alg: "RS256", kid: "browser-key" })
    .setIssuer("https://sso.example.com")
    .setAudience(input.audience)
    .setSubject("pairwise_user")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);
}

async function waitFor(predicate: () => boolean) {
  for (let index = 0; index < 50; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Timed out waiting for browser state");
}

function installPopupBrowser(frontendOrigin: string) {
  const originalWindow = globalThis.window;
  const listeners = new Set<(event: MessageEvent) => void>();
  const popup = {
    closed: false,
    close() { this.closed = true; },
  };
  let openedUrl = "";
  const storage = createMemoryStorage();
  const fakeWindow = {
    location: {
      origin: frontendOrigin,
      href: `${frontendOrigin}/`,
      assign() {},
    },
    sessionStorage: storage,
    localStorage: createMemoryStorage(),
    screenX: 0,
    screenY: 0,
    outerWidth: 1440,
    outerHeight: 900,
    open(url: string | URL) {
      openedUrl = String(url);
      return popup;
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    addEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === "message") listeners.add(listener);
    },
    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
      if (type === "message") listeners.delete(listener);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });

  return {
    popup,
    get openedUrl() { return openedUrl; },
    complete(origin: string, data: unknown) {
      for (const listener of listeners) {
        listener({ origin, source: popup, data } as unknown as MessageEvent);
      }
    },
    restore() {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    },
  };
}

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) { return values.get(key) ?? null; },
    setItem(key: string, value: string) { values.set(key, value); },
    removeItem(key: string) { values.delete(key); },
  };
}
