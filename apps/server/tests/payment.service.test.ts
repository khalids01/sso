import { describe, expect, it, mock } from "bun:test";

import { resolvePaymentCustomerState } from "../src/modules/session/payment.service";

describe("resolvePaymentCustomerState", () => {
  it("does not load Polar state when Polar is disabled", async () => {
    const loadCustomerState = mock(async () => ({ activeSubscriptions: [] }));

    const state = await resolvePaymentCustomerState({
      polarEnabled: false,
      billingEligible: true,
      loadCustomerState,
    });

    expect(state).toBeNull();
    expect(loadCustomerState).not.toHaveBeenCalled();
  });

  it("does not load Polar state for a non-billing user", async () => {
    const loadCustomerState = mock(async () => ({ activeSubscriptions: [] }));

    const state = await resolvePaymentCustomerState({
      polarEnabled: true,
      billingEligible: false,
      loadCustomerState,
    });

    expect(state).toBeNull();
    expect(loadCustomerState).not.toHaveBeenCalled();
  });

  it("returns no subscription state for a missing customer", async () => {
    const state = await resolvePaymentCustomerState({
      polarEnabled: true,
      billingEligible: true,
      loadCustomerState: async () => null,
    });

    expect(state).toBeNull();
  });

  it("does not hide unrelated Polar failures", async () => {
    const failure = new Error("Polar unavailable");

    expect(
      resolvePaymentCustomerState({
        polarEnabled: true,
        billingEligible: true,
        loadCustomerState: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
  });
});
