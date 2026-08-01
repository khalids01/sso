import { describe, expect, test } from "bun:test";

import { getProviderRedirect } from "./provider-redirect";

describe("OAuth provider redirects", () => {
  test("reads the redirect response returned by OAuth continuation", () => {
    expect(
      getProviderRedirect({
        redirect: true,
        url: "http://localhost:4000/api/auth/oauth2/callback?code=code-1",
      }),
    ).toBe("http://localhost:4000/api/auth/oauth2/callback?code=code-1");
  });

  test("keeps compatibility with alternate redirect response keys", () => {
    expect(getProviderRedirect({ redirect_uri: "https://app.test/callback" })).toBe(
      "https://app.test/callback",
    );
    expect(getProviderRedirect({ uri: "https://app.test/consent" })).toBe(
      "https://app.test/consent",
    );
  });

  test("rejects a response without a redirect URL", () => {
    expect(getProviderRedirect({ redirect: true })).toBeNull();
  });
});
