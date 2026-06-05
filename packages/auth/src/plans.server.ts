const proMonthlyProductId = process.env.POLAR_PRO_MONTHLY_ID ?? "";
const proYearlyProductId = process.env.POLAR_PRO_YEARLY_ID ?? "";

export const PLANS = {
  FREE: {
    slug: "free",
    name: "Free",
    productId: "",
  },
  PRO_MONTHLY: {
    slug: "pro_monthly",
    name: "Pro Monthly",
    productId: proMonthlyProductId,
  },
  PRO_YEARLY: {
    slug: "pro_yearly",
    name: "Pro Yearly",
    productId: proYearlyProductId,
  },
} as const;

export type Plan = keyof typeof PLANS;
export type PlanSlug = (typeof PLANS)[Plan]["slug"];
