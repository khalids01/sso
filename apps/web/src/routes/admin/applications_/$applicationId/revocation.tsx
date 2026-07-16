import { createFileRoute } from "@tanstack/react-router";
import { ApplicationRevocationPage } from "@/features/admin/applications/application-revocation-page";

export const Route = createFileRoute(
  "/admin/applications_/$applicationId/revocation",
)({
  component: ApplicationRevocationRoute,
});

function ApplicationRevocationRoute() {
  const { applicationId } = Route.useParams();
  return <ApplicationRevocationPage applicationId={applicationId} />;
}
