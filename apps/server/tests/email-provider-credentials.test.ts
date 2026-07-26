import { describe, expect, it } from "bun:test";
import {
  decryptEmailProviderSecret,
  encryptEmailProviderSecret,
} from "../../../packages/email/src/application-email.server";

describe("email provider credentials", () => {
  it("encrypts provider secrets with authenticated encryption", () => {
    const encrypted = encryptEmailProviderSecret("re_secret-value");
    expect(encrypted).not.toContain("re_secret-value");
    expect(decryptEmailProviderSecret(encrypted)).toBe("re_secret-value");
  });

  it("uses randomized ciphertext for the same secret", () => {
    expect(encryptEmailProviderSecret("same")).not.toBe(
      encryptEmailProviderSecret("same"),
    );
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptEmailProviderSecret("secret");
    expect(() => decryptEmailProviderSecret(`${encrypted}tampered`)).toThrow();
  });
});
