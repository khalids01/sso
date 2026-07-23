import { createFileRoute } from "@tanstack/react-router";
import { OAuthManagerPage } from "@/features/admin/oauth-connections/oauth-manager-page";

export const Route = createFileRoute("/admin/oauth-manager")({
  component: OAuthManagerPage,
});
