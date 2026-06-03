import { Elysia } from "elysia";
import { toPermissionArray } from "@rbac";
import { authGuard } from "@/guards/auth.guard";

export const sessionController = new Elysia({
  prefix: "/session",
  detail: { tags: ["Session"] },
})
  .use(authGuard)
  .get(
    "/context",
    ({ user, permissions }) => {
      if (!user) {
        return { user: null, permissions: [] };
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (user as { role?: string }).role ?? "USER",
          onboardingComplete: Boolean(
            (user as { onboardingComplete?: boolean }).onboardingComplete,
          ),
          plan:
            typeof (user as { plan?: string }).plan === "string"
              ? (user as { plan?: string }).plan
              : null,
          subscriptionStatus:
            typeof (user as { subscriptionStatus?: string }).subscriptionStatus ===
            "string"
              ? (user as { subscriptionStatus?: string }).subscriptionStatus
              : null,
        },
        permissions: toPermissionArray(permissions ?? new Set()),
      };
    },
    {
      detail: { summary: "Authenticated session context with permissions" },
    },
  );
