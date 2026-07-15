import { cn } from "@/lib/utils";
import type { AdminApplication } from "../../types";
import type { LifecycleFilter, PendingAction } from "../../page-types";
import { ApplicationActionsMenu } from "./application-actions-menu";
import { ApplicationSummary } from "./application-summary";

export function ApplicationItem(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  viewMode: "list" | "grid";
  onView: () => void;
  onEdit: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  const { application, viewMode } = props;

  return (
    <div
      className={cn(
        "rounded-md border bg-background",
        viewMode === "list" &&
          "rounded-none border-x-0 border-t-0 last:border-b-0",
      )}
    >
      <div className="relative px-4 py-3">
        <div className="w-full min-w-0 pr-12">
          <ApplicationSummary application={application} viewMode={viewMode} />
        </div>
        <div className="absolute right-3 top-2.5">
          <ApplicationActionsMenu
            application={application}
            filter={props.filter}
            onView={props.onView}
            onEdit={props.onEdit}
            onLifecycle={props.onLifecycle}
          />
        </div>
      </div>
    </div>
  );
}
