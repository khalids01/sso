import { describe, expect, test } from "bun:test";
import {
  createSocialProviderContext,
  decryptSocialProviderSecret,
  encryptSocialProviderSecret,
  verifySocialProviderContext,
} from "../src/modules/auth/social-provider-credentials.service";

describe("application social provider credentials", () => {
  test("encrypts secrets with authenticated encryption", () => {
    const encrypted = encryptSocialProviderSecret("provider-secret");
    expect(encrypted).not.toContain("provider-secret");
    expect(decryptSocialProviderSecret(encrypted)).toBe("provider-secret");

    const parts = encrypted.split(".");
    parts[3] = `${parts[3]!.slice(0, -1)}A`;
    expect(() => decryptSocialProviderSecret(parts.join("."))).toThrow();
  });

  test("signs the callback context and rejects tampering", () => {
    const context = createSocialProviderContext("google", "sso_client_example");
    expect(verifySocialProviderContext(context)).toMatchObject({
      provider: "google",
      clientId: "sso_client_example",
    });
    expect(verifySocialProviderContext(`${context}x`)).toBeNull();
  });
});
