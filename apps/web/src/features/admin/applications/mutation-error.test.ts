import { describe, expect, test } from "bun:test";
import { getMutationErrorMessage } from "./mutation-error";

describe("getMutationErrorMessage", () => {
  test("uses the API validation message returned by Eden", () => {
    expect(
      getMutationErrorMessage(
        {
          value: {
            code: "AUTH_METHOD_UNAVAILABLE",
            message:
              "Password authentication requires ENABLE_PASSWORD_AUTH=true on the SSO server",
            details: {
              field: "signInMethods",
              methods: [
                {
                  id: "password",
                  reason:
                    "Password authentication requires ENABLE_PASSWORD_AUTH=true on the SSO server",
                },
              ],
            },
          },
        },
        "Failed to update revocation webhook",
      ),
    ).toBe(
      "Password authentication requires ENABLE_PASSWORD_AUTH=true on the SSO server",
    );
  });

  test("uses a plain API error body returned by Eden", () => {
    expect(
      getMutationErrorMessage(
        { value: "Webhook URL must use HTTPS" },
        "Failed to update revocation webhook",
      ),
    ).toBe("Webhook URL must use HTTPS");
  });

  test("falls back when the error has no useful message", () => {
    expect(getMutationErrorMessage({}, "Update failed")).toBe("Update failed");
  });
});
