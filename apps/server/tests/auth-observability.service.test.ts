import { describe, expect, it, mock } from "bun:test";
import {
  observeBetterAuthFailure,
  recordLoginDenied,
} from "../src/modules/auth/auth-observability.service";

describe("authentication failure observability", () => {
  it("records a password denial without request secrets", async () => {
    const writer = mock(async () => undefined);
    const request = new Request("http://localhost/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        password: "do-not-store",
      }),
    });
    const response = Response.json(
      { code: "INVALID_EMAIL_OR_PASSWORD", message: "Login failed" },
      { status: 401 },
    );

    const recorded = await observeBetterAuthFailure(
      { request, response, requestId: "request-1" },
      writer,
    );

    expect(recorded).toBe(true);
    expect(writer).toHaveBeenCalledWith({
      type: "auth.login.denied",
      severity: "warning",
      message: "Login attempt denied",
      metadata: {
        requestId: "request-1",
        reason: "invalid_email_or_password",
        method: "password",
        status: 401,
      },
    });
    const serializedEvent = JSON.stringify(writer.mock.calls[0]);
    expect(serializedEvent).not.toContain("person@example.com");
    expect(serializedEvent).not.toContain("do-not-store");
  });

  it("records an authorization denial without redirect or state values", async () => {
    const writer = mock(async () => undefined);
    const request = new Request(
      "http://localhost/api/auth/oauth2/authorize?client_id=client_123&redirect_uri=https%3A%2F%2Fapp.example%2Fcallback%3Fsecret%3Dyes&state=signed-secret",
    );
    const response = Response.json({ error: "invalid_redirect_uri" }, { status: 400 });

    await observeBetterAuthFailure(
      { request, response, requestId: "request-2" },
      writer,
    );

    expect(writer).toHaveBeenCalledWith({
      type: "oauth.authorization.denied",
      severity: "warning",
      message: "OAuth authorization request denied",
      metadata: {
        requestId: "request-2",
        reason: "invalid_redirect_uri",
        status: 400,
        clientId: "client_123",
      },
    });
    const serializedEvent = JSON.stringify(writer.mock.calls[0]);
    expect(serializedEvent).not.toContain("app.example");
    expect(serializedEvent).not.toContain("signed-secret");
  });

  it("ignores successful and unrelated Better Auth responses", async () => {
    const writer = mock(async () => undefined);

    expect(
      await observeBetterAuthFailure(
        {
          request: new Request("http://localhost/api/auth/sign-in/email"),
          response: Response.json({ ok: true }),
          requestId: "request-3",
        },
        writer,
      ),
    ).toBe(false);
    expect(
      await observeBetterAuthFailure(
        {
          request: new Request("http://localhost/api/auth/sign-out"),
          response: Response.json({ error: "failure" }, { status: 400 }),
          requestId: "request-4",
        },
        writer,
      ),
    ).toBe(false);
    expect(writer).not.toHaveBeenCalled();
  });

  it("replaces unsafe provider error text with a fixed reason", async () => {
    const writer = mock(async () => undefined);
    await observeBetterAuthFailure(
      {
        request: new Request("http://localhost/api/auth/sign-in/email"),
        response: Response.json(
          { error: "Login failed for person@example.com" },
          { status: 400 },
        ),
        requestId: "request-5",
      },
      writer,
    );

    expect(writer.mock.calls[0]?.[0].metadata.reason).toBe("request_rejected");
  });

  it("records a sanitized magic-link denial", async () => {
    const writer = mock(async () => undefined);

    await recordLoginDenied(
      {
        requestId: "request-6",
        reason: "user_not_found",
        method: "magic_link",
        status: 400,
      },
      writer,
    );

    expect(writer).toHaveBeenCalledWith({
      type: "auth.login.denied",
      severity: "warning",
      message: "Login attempt denied",
      metadata: {
        requestId: "request-6",
        reason: "user_not_found",
        method: "magic_link",
        status: 400,
      },
    });
  });
});
