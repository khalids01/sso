import { createFileRoute } from "@tanstack/react-router";
import { ApplicationClientsPage } from "@/features/admin/applications/application-clients-page";

export const Route = createFileRoute(
  "/admin/applications_/$applicationId/clients",
)({
  component: ApplicationClientsRoute,
});

function ApplicationClientsRoute() {
  const { applicationId } = Route.useParams();
  return <ApplicationClientsPage applicationId={applicationId} />;
}
