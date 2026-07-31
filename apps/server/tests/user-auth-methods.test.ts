import { describe, expect, it } from "bun:test";
import { mapUserAuthMethods } from "../src/modules/admin/user-auth-methods";

describe("mapUserAuthMethods", () => {
  it("returns every linked or successfully used method without duplicates", () => {
    const methods = mapUserAuthMethods({
      accounts: [
        { providerId: "credential", oauthProviderConnection: null },
        {
          providerId: "github",
          oauthProviderConnection: {
            id: "github-connection-1",
            name: "Platform GitHub",
            provider: "github",
          },
        },
      ],
      usageEvents: [{ authMethod: "password" }, { authMethod: "magic_link" }],
    });

    expect(methods.map((method) => method.id)).toEqual([
      "password",
      "github",
      "magic_link",
    ]);
    expect(methods[1]?.oauthConnection?.name).toBe("Platform GitHub");
  });
});
