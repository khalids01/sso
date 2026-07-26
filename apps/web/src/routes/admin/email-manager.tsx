import { createFileRoute } from "@tanstack/react-router";
import { EmailManagerPage } from "@/features/admin/email-connections/email-manager-page";

export const Route = createFileRoute("/admin/email-manager")({
  component: EmailManagerPage,
});
