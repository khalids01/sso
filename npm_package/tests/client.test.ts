import { expect, test } from "bun:test";
import { createSsoClient } from "../src/client/index.js";

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
