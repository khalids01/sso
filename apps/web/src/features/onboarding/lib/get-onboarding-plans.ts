import { createServerFn } from "@tanstack/react-start";
import { PLANS } from "@auth/client";

export type OnboardingPlanOption = {
  slug: string;
  name: string;
  selectable: boolean;
};

export const getOnboardingPlans = createServerFn({ method: "GET" }).handler(
  async () => {
    return Object.values(PLANS).map((plan) => ({
      slug: plan.slug,
      name: plan.name,
      selectable: plan.selectable,
    })) satisfies OnboardingPlanOption[];
  },
);
