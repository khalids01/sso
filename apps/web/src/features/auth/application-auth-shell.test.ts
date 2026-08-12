import { describe, expect, test } from "bun:test";

import { getRequestedApplicationSocialProvider } from "./application-social-provider";

describe("application social-provider selection", () => {
  test("reads a provider selected by the React SDK from the signed OIDC nonce", () => {
    expect(
      getRequestedApplicationSocialProvider(
        "?nonce=skycanvas-provider-github-abcdefghijklmnopqrstuvwx&sig=signed",
      ),
    ).toBe("github");
  });

  test("does not accept a malformed provider nonce", () => {
    expect(getRequestedApplicationSocialProvider("?nonce=skycanvas-provider-github-short")).toBeNull();
  });
});
