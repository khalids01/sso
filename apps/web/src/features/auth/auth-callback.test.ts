import { describe, expect, test } from "bun:test";
import {
  getApplicationAuthPath,
  getAuthCallbackURLForLocation,
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
});
