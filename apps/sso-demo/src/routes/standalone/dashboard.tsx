import { createFileRoute } from "@tanstack/react-router";
import { StandaloneDashboardPage } from "@/features/standalone";

export const Route = createFileRoute("/standalone/dashboard")({
  component: StandaloneDashboardPage,
});
