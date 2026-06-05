import { describe, expect, it } from "bun:test";

describe("auth rate-limit config", () => {
  it("keeps Better Auth rate-limit enabled and magic-link limits explicit", async () => {
    const authConfigPath = new URL(
      "../../../packages/auth/src/auth-options.ts",
      import.meta.url,
    );
    const source = await Bun.file(authConfigPath).text();

    expect(source).toMatch(
      /rateLimit:\s*\{\s*enabled:\s*true,\s*window:\s*10,\s*max:\s*100,\s*\}/s,
    );
    expect(source).toMatch(
      /magicLink\(\{\s*rateLimit:\s*\{\s*window:\s*60,\s*max:\s*5,\s*\}/s,
    );
  });
});

