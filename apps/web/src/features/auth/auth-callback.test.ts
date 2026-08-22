import { describe, expect, test } from "bun:test";
import {
  getApplicationAuthPath,
  getAuthCallbackURLForLocation,
  getSocialAuthCallbackURLForLocation,
  getSocialAuthErrorMessage,
  requiresFreshAuthentication,
} from "./auth-callback";

const oauthSearch =
  "?client_id=client-1&state=state-1&sig=signature&exp=123&code_challenge=challenge&code_challenge_method=S256&nonce=nonce-1&redirect_uri=http%3A%2F%2Flocalhost%3A5011%2Fauth%2Fcallback";

describe("OAuth authentication navigation", () => {
  test("preserves the complete signed query between application auth pages", () => {
    expect(getApplicationAuthPath("/application/signup", oauthSearch)).toBe(
      `/application/signup${oauthSearch}`,
    );
  });

  test("continues OAuth through the authorization page", () => {
    expect(getAuthCallbackURLForLocation("http://localhost:5002", oauthSearch)).toBe(
      `http://localhost:5002/authorize${oauthSearch}`,
    );
  });

  test("keeps platform authentication pointed at the dashboard", () => {
    expect(getAuthCallbackURLForLocation("http://localhost:5002", "")).toBe(
      "http://localhost:5002/dashboard",
    );
  });

  test("returns social OAuth failures to the original application sign-in page", () => {
    expect(getSocialAuthCallbackURLForLocation("http://localhost:5002", oauthSearch)).toBe(
      `http://localhost:5002/application/login${oauthSearch}`,
    );
  });

  test("shows a professional error without restarting the failed social provider", () => {
    expect(getSocialAuthErrorMessage(`${oauthSearch}&error=user_not_found`)).toBe(
      "No account is associated with this sign-in method. Contact your administrator or use another sign-in method.",
    );
    expect(getApplicationAuthPath("/application/signup", `${oauthSearch}&error=user_not_found`)).toBe(
      `/application/signup${oauthSearch}`,
    );
  });

  test("detects an explicit request to authenticate with another account", () => {
    expect(requiresFreshAuthentication(`${oauthSearch}&prompt=login`)).toBe(true);
    expect(requiresFreshAuthentication(oauthSearch)).toBe(false);
  });
});
