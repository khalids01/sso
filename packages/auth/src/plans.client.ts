export const PLANS = {
  FREE: {
    slug: "free",
    name: "Free",
    selectable: true,
  },
  PRO_MONTHLY: {
    slug: "pro_monthly",
    name: "Pro Monthly",
    selectable: false,
  },
  PRO_YEARLY: {
    slug: "pro_yearly",
    name: "Pro Yearly",
    selectable: false,
  },
} as const;

export type Plan = keyof typeof PLANS;
export type PlanSlug = (typeof PLANS)[Plan]["slug"];
