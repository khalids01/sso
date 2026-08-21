import { createFileRoute } from "@tanstack/react-router";
import { ApplicationWebhooksPage } from "@/features/admin/applications/application-webhooks-page";

export const Route = createFileRoute(
  "/admin/applications_/$applicationId/webhooks",
)({
  component: ApplicationWebhooksRoute,
});

function ApplicationWebhooksRoute() {
  const { applicationId } = Route.useParams();
  return <ApplicationWebhooksPage applicationId={applicationId} />;
}
