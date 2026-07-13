import { UserPlus } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationMember,
} from "../../types";
import type {
  LifecycleFilter,
  MemberFilter,
  PendingAction,
} from "../page-types";
import { ApplicationActionsMenu } from "./application-actions-menu";
import { ApplicationClientsList } from "./application-clients-list";
import { ApplicationMembersList } from "./application-members-list";
import { ApplicationSummary } from "./application-summary";
import { MemberSegmentedFilter, SegmentedFilter } from "./ui-controls";

export function ApplicationAccordionItem(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  clientFilter: LifecycleFilter;
  memberFilter: MemberFilter;
  viewMode: "list" | "grid";
  onClientFilterChange: (filter: LifecycleFilter) => void;
  onMemberFilterChange: (filter: MemberFilter) => void;
  onView: () => void;
  onEdit: () => void;
  onCreateClient: () => void;
  onGrantAccess: () => void;
  onLifecycle: (action: PendingAction) => void;
  onViewClient: (client: ApplicationClient) => void;
  onViewMember: (member: ApplicationMember) => void;
  onEditClient: (client: ApplicationClient) => void;
}) {
  const { application, viewMode } = props;

  return (
    <AccordionItem
      value={application.id}
      className={cn(
        "rounded-md border bg-background",
        viewMode === "list" &&
          "rounded-none border-x-0 border-t-0 last:border-b-0",
      )}
    >
      <div className="relative px-4 py-3">
        <AccordionTrigger className="w-full min-w-0 py-0 pr-12 hover:no-underline">
          <ApplicationSummary application={application} viewMode={viewMode} />
        </AccordionTrigger>
        <div className="absolute right-3 top-2.5">
          <ApplicationActionsMenu
            application={application}
            filter={props.filter}
            onView={props.onView}
            onEdit={props.onEdit}
            onCreateClient={props.onCreateClient}
            onLifecycle={props.onLifecycle}
          />
        </div>
      </div>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Members</div>
              <div className="text-xs text-muted-foreground">
                Users allowed to sign in to this application.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <MemberSegmentedFilter
                value={props.memberFilter}
                onChange={props.onMemberFilterChange}
              />
              <Button
                type="button"
                size="sm"
                className="gap-2"
                disabled={props.filter === "archived"}
                onClick={props.onGrantAccess}
              >
                <UserPlus className="h-4 w-4" />
                Grant access
              </Button>
            </div>
          </div>
          <ApplicationMembersList
            application={application}
            filter={props.memberFilter}
            onView={props.onViewMember}
            onLifecycle={props.onLifecycle}
          />
        </div>
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">Clients</div>
              <div className="text-xs text-muted-foreground">
                Technical login clients for this application.
              </div>
            </div>
            <SegmentedFilter
              value={props.clientFilter}
              onChange={props.onClientFilterChange}
            />
          </div>
          <ApplicationClientsList
            application={application}
            filter={props.clientFilter}
            onView={props.onViewClient}
            onEdit={props.onEditClient}
            onLifecycle={props.onLifecycle}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
