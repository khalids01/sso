import { Elysia } from "elysia";
import { toPermissionArray } from "@rbac";
import { getUserSessionRbac } from "@db/rbac/session";
import { authGuard } from "@/guards/auth.guard";

export const sessionController = new Elysia({
  prefix: "/session",
  detail: { tags: ["Session"] },
})
  .use(authGuard)
  .get(
    "/context",
    async ({ user, userId }) => {
      if (!user || !userId) {
        return { user: null, permissions: [], roles: [] };
      }

      const rbac = await getUserSessionRbac(userId);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
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
        permissions: toPermissionArray(new Set(rbac.permissions)),
        roles: rbac.roles,
        primaryRoleSlug: rbac.primaryRoleSlug,
      };
    },
    {
      detail: { summary: "Authenticated session context with permissions" },
    },
  );
