import { describe, expect, it } from "bun:test";

import {
  shouldRedirectToAuthorizationUI,
  validateAuthorizationQuery,
} from "../../../packages/auth/src/lib/application-authorization.server";

const validQuery = {
  state: "state-1",
  scope: "openid",
  code_challenge_method: "S256",
  code_challenge: "a".repeat(43),
};

describe("OAuth authorization request validation", () => {
  it("accepts the initial supported protocol shape", () => {
    expect(() => validateAuthorizationQuery(validQuery)).not.toThrow();
  });

  it("requires state", () => {
    expect(() =>
      validateAuthorizationQuery({ ...validQuery, state: "" }),
    ).toThrow();
  });

  it("accepts only the openid scope", () => {
    expect(() =>
      validateAuthorizationQuery({ ...validQuery, scope: "openid email" }),
    ).toThrow();
  });

  it("rejects prompt parameters", () => {
    expect(() =>
      validateAuthorizationQuery({ ...validQuery, prompt: "consent" }),
    ).toThrow();
  });

  it("rejects client-controlled resource indicators", () => {
    expect(() =>
      validateAuthorizationQuery({
        ...validQuery,
        resource: "https://resource.example.test",
      }),
    ).toThrow();
  });

  it("requires an exact S256 PKCE challenge shape", () => {
    expect(() =>
      validateAuthorizationQuery({
        ...validQuery,
        code_challenge_method: "plain",
      }),
    ).toThrow();
    expect(() =>
      validateAuthorizationQuery({ ...validQuery, code_challenge: "short" }),
    ).toThrow();
  });

  it("rejects forged continuation data before application access", async () => {
    const proc = Bun.spawn({
      cmd: [
        "bun",
        "--env-file",
        "apps/server/.env",
        "-e",
        `
          const { auth } = await import("./packages/auth/src/auth-instance.server.ts");
          const response = await auth.handler(new Request(
            "http://localhost:5001/api/auth/oauth2/continue",
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                postLogin: true,
                oauth_query: "client_id=sso_client_fake&sig=bad&exp=4102444800",
              }),
            },
          ));
          console.log(JSON.stringify({
            status: response.status,
            body: await response.json(),
          }));
        `,
      ],
      cwd: new URL("../../..", import.meta.url).pathname,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (exitCode !== 0) {
      throw new Error(stderr);
    }

    const result = JSON.parse(stdout.trim().split("\n").at(-1)!) as {
      status: number;
      body: { error: string };
    };
    expect(result).toEqual({
      status: 400,
      body: { error: "invalid_signature" },
    });
  });
});

describe("OAuth authorization UI continuation", () => {
  it("redirects initial navigation and completes only from the exact web origin", () => {
    expect(
      shouldRedirectToAuthorizationUI(new Headers(), "https://sso.example.com"),
    ).toBe(true);
    expect(
      shouldRedirectToAuthorizationUI(
        new Headers({ origin: "https://other.example.com" }),
        "https://sso.example.com",
      ),
    ).toBe(true);
    expect(
      shouldRedirectToAuthorizationUI(
        new Headers({ origin: "https://sso.example.com" }),
        "https://sso.example.com/path",
      ),
    ).toBe(false);
  });
});
