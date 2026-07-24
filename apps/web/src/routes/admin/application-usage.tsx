import { createFileRoute } from "@tanstack/react-router";
import { ApplicationUsagePage } from "@/features/admin/application-usage/application-usage-page";

export const Route = createFileRoute("/admin/application-usage")({
  validateSearch: (search) => ({
    applicationId:
      typeof search.applicationId === "string"
        ? search.applicationId
        : undefined,
  }),
  component: ApplicationUsageRoute,
});

function ApplicationUsageRoute() {
  const search = Route.useSearch();
  return <ApplicationUsagePage applicationId={search.applicationId} />;
}
