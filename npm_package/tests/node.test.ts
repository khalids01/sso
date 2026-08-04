import { describe, expect, test } from "bun:test";

import { createNodeSsoHandler, nodeRequestHeaders, toWebRequest } from "../src/node/index.js";
import type { SsoServer } from "../src/server/index.js";

describe("Node framework adapter", () => {
  test("normalizes Express and NestJS request headers", () => {
    const request = {
      method: "GET",
      originalUrl: "/auth/profile?from=test",
      protocol: "https",
      headers: {
        host: "app.example.com",
        cookie: "sso_session=value",
        "x-list": ["one", "two"],
      },
    };
    expect(nodeRequestHeaders(request).get("cookie")).toBe("sso_session=value");
    expect(toWebRequest(request).url).toBe("https://app.example.com/auth/profile?from=test");
  });

  test("writes a Web response to a Node response", async () => {
    const sso = {
      handle: async () => new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { "content-type": "application/json", "set-cookie": "session=value" },
      }),
    } as unknown as SsoServer;
    const responseHeaders = new Map<string, string | readonly string[]>();
    let status = 0;
    let body = "";
    const target = {
      get statusCode() { return status; },
      set statusCode(value: number) { status = value; },
      setHeader(name: string, value: string | readonly string[]) { responseHeaders.set(name, value); },
      end(value?: Uint8Array) { body = value ? new TextDecoder().decode(value) : ""; },
    };

    await createNodeSsoHandler(sso)({
      method: "GET",
      url: "/auth/profile",
      headers: { host: "app.example.com" },
    }, target);

    expect(status).toBe(201);
    expect(responseHeaders.get("content-type")).toContain("application/json");
    expect(responseHeaders.get("set-cookie")).toEqual(["session=value"]);
    expect(body).toBe(JSON.stringify({ ok: true }));
  });
});
