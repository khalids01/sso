import { describe, expect, test } from "bun:test";

import { createSsoBetterAuthClient } from "../src/better-auth/index.js";

function setup() {
  const calls: string[] = [];
  let destination = "";
  const authClient = {
    signIn: {
      oauth2: async ({ callbackURL }: { providerId: "skycanvas"; callbackURL: string }) => {
        calls.push(`login:${callbackURL}`);
        return {};
      },
    },
    signOut: async () => {
      calls.push("logout");
      return {};
    },
  };
  const sso = createSsoBetterAuthClient({
    authClient,
    clientId: "client_123",
    baseUrl: "https://sso.example.com",
    appUrl: "https://app.example.com",
    navigate: (url) => { destination = url; },
  });
  return { calls, getDestination: () => destination, sso };
}

describe("Better Auth SSO client", () => {
  test("starts SSO sign-in", async () => {
    const { calls, sso } = setup();
    await sso.signIn("/dashboard");
    expect(calls).toEqual(["login:/dashboard"]);
  });

  test("clears local and central sessions by default", async () => {
    const { calls, getDestination, sso } = setup();
    await sso.signOut({ returnTo: "/signed-out" });
    expect(calls).toEqual(["logout"]);
    expect(getDestination()).toBe(
      "https://sso.example.com/api/auth/global-sign-out?client_id=client_123&return_to=https%3A%2F%2Fapp.example.com%2Fsigned-out",
    );
  });

  test("can explicitly keep logout local", async () => {
    const { calls, getDestination, sso } = setup();
    await sso.signOut({ global: false });
    expect(calls).toEqual(["logout"]);
    expect(getDestination()).toBe("");
  });
});
