export async function resolvePaymentCustomerState<T>(input: {
  polarEnabled: boolean;
  billingEligible: boolean;
  loadCustomerState: () => Promise<T | null>;
}): Promise<T | null> {
  if (!input.polarEnabled || !input.billingEligible) {
    return null;
  }

  return input.loadCustomerState();
}
