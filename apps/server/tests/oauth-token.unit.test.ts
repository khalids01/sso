import { describe, expect, it } from "bun:test";
import {
  createS256Challenge,
  hashOAuthToken,
  isValidPkceVerifier,
  securelyMatchesChallenge,
} from "../../../packages/auth/src/lib/oauth-token.server";

describe("OAuth token primitives", () => {
  it("hashes tokens deterministically with SHA-256 base64url", () => {
    expect(hashOAuthToken("authorization-code")).toBe(
      "WVYUJ4163Fe7kuKPogOooY15egdoT9_3XLvyqW6_hXc",
    );
  });

  it("accepts only RFC 7636 verifier characters and length", () => {
    expect(isValidPkceVerifier("a".repeat(43))).toBe(true);
    expect(isValidPkceVerifier("A-._~0".repeat(18).slice(0, 128))).toBe(true);
    expect(isValidPkceVerifier("a".repeat(42))).toBe(false);
    expect(isValidPkceVerifier("a".repeat(129))).toBe(false);
    expect(isValidPkceVerifier(`${"a".repeat(42)}!`)).toBe(false);
  });

  it("creates and securely verifies an S256 challenge", () => {
    const verifier = "test-verifier-abcdefghijklmnopqrstuvwxyz-0123456789";
    const challenge = createS256Challenge(verifier);
    expect(challenge).toHaveLength(43);
    expect(securelyMatchesChallenge(verifier, challenge)).toBe(true);
    expect(securelyMatchesChallenge(`${verifier}x`, challenge)).toBe(false);
  });
});
