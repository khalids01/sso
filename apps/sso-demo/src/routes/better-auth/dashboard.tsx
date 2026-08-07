import { createFileRoute } from "@tanstack/react-router";
import { BetterAuthDashboardPage } from "@/features/better-auth";

export const Route = createFileRoute("/better-auth/dashboard")({
  component: BetterAuthDashboardPage,
});
