import { createHash, timingSafeEqual } from "node:crypto";

const pkceVerifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;

export function hashOAuthToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

export function createS256Challenge(verifier: string) {
  return hashOAuthToken(verifier);
}

export function isValidPkceVerifier(verifier: string) {
  return pkceVerifierPattern.test(verifier);
}

export function securelyMatchesChallenge(verifier: string, expected: string) {
  if (!isValidPkceVerifier(verifier)) return false;
  const actual = Buffer.from(createS256Challenge(verifier));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}
