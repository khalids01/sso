import { describe, expect, it } from "bun:test";

import { isMissingPolarCustomerError } from "./polar-error";

describe("isMissingPolarCustomerError", () => {
  it("matches only Polar resource-not-found responses", () => {
    const missingCustomer = Object.assign(new Error("Customer not found"), {
      name: "ResourceNotFound",
      statusCode: 404,
    });

    expect(isMissingPolarCustomerError(missingCustomer)).toBe(true);
    expect(
      isMissingPolarCustomerError(
        Object.assign(new Error("Polar unavailable"), {
          name: "PolarError",
          statusCode: 503,
        }),
      ),
    ).toBe(false);
    expect(isMissingPolarCustomerError(new Error("Customer not found"))).toBe(
      false,
    );
  });
});
