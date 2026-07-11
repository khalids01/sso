import { createFileRoute } from "@tanstack/react-router";
import { AdminApplicationsPage } from "@/features/admin/applications/applications-page";

export const Route = createFileRoute("/admin/applications")({
  component: AdminApplicationsPage,
});
