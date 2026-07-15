import { createFileRoute } from "@tanstack/react-router";
import { ApplicationMembersPage } from "@/features/admin/applications/application-members-page";

export const Route = createFileRoute(
  "/admin/applications_/$applicationId/members",
)({
  component: ApplicationMembersRoute,
});

function ApplicationMembersRoute() {
  const { applicationId } = Route.useParams();
  return <ApplicationMembersPage applicationId={applicationId} />;
}
