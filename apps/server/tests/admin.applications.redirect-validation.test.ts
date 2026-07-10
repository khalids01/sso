import { describe, expect, it } from "bun:test";
import {
  ApplicationUrlValidationError,
  isExactOriginAllowed,
  isExactRedirectUriAllowed,
  normalizeOrigin,
  normalizeRedirectUri,
} from "../src/modules/admin/applications/redirect-validation";

describe("application redirect and origin validation", () => {
  it("accepts valid HTTPS redirect URIs", () => {
    expect(normalizeRedirectUri("https://app.example.com/callback")).toBe(
      "https://app.example.com/callback",
    );
  });

  it("accepts localhost HTTP redirect URIs for development", () => {
    expect(normalizeRedirectUri("http://localhost:5002/auth/callback")).toBe(
      "http://localhost:5002/auth/callback",
    );
  });

  it("rejects redirect URI fragments", () => {
    expect(() =>
      normalizeRedirectUri("https://app.example.com/callback#token"),
    ).toThrow(ApplicationUrlValidationError);
  });

  it("rejects non-HTTP redirect URI protocols", () => {
    expect(() => normalizeRedirectUri("javascript:alert(1)")).toThrow(
      ApplicationUrlValidationError,
    );
  });

  it("does not allow prefix-style redirect URI matches", () => {
    expect(
      isExactRedirectUriAllowed("https://app.example.com/callback/extra", [
        "https://app.example.com/callback",
      ]),
    ).toBe(false);
  });

  it("normalizes origins to protocol plus host only", () => {
    expect(normalizeOrigin("https://app.example.com/path?x=1")).toBe(
      "https://app.example.com",
    );
  });

  it("matches origins exactly after normalization", () => {
    expect(
      isExactOriginAllowed("https://app.example.com/settings", [
        "https://app.example.com",
      ]),
    ).toBe(true);
    expect(
      isExactOriginAllowed("https://evil.example.com", [
        "https://app.example.com",
      ]),
    ).toBe(false);
  });
});
