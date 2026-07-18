import { describe, expect, test } from "bun:test";
import { getMutationErrorMessage } from "./mutation-error";

describe("getMutationErrorMessage", () => {
  test("uses the API validation message returned by Eden", () => {
    expect(
      getMutationErrorMessage(
        { value: { message: "Webhook destination resolves to a private or reserved address" } },
        "Failed to update revocation webhook",
      ),
    ).toBe("Webhook destination resolves to a private or reserved address");
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
