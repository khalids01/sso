import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { AppWindow, ArrowRight, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminApplication } from "../../types";
import type { LifecycleFilter, PendingAction } from "../../page-types";
import { ApplicationActionsMenu } from "./application-actions-menu";
import { ApplicationSummary } from "./application-summary";
import { StatusBadge } from "../../components/ui-controls";

export function ApplicationItem(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  viewMode: "list" | "grid";
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  const { application, viewMode } = props;

  if (viewMode === "grid") {
    return (
      <Card
        aria-label={`Application ${application.name}`}
        className="min-h-64 transition-colors hover:ring-foreground/20"
      >
        <CardHeader className="grid-cols-[1fr_auto] gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <AppWindow className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {application.name}
              </CardTitle>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {application.slug}
              </p>
            </div>
          </div>
          <CardAction>
            <ApplicationActionsMenu
              application={application}
              filter={props.filter}
              canManage={props.canManage}
              onView={props.onView}
              onEdit={props.onEdit}
              onLifecycle={props.onLifecycle}
            />
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4">
          <div>
            <StatusBadge status={application.status} />
            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
              {application.description || "No application description."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/applications/$applicationId/clients"
              params={{ applicationId: application.id }}
              className="rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted"
            >
              <KeyRound className="mb-2 size-4 text-muted-foreground" />
              <span className="block text-lg font-semibold">
                {application.clientCount}
              </span>
              <span className="text-xs text-muted-foreground">Clients</span>
            </Link>
            <Link
              to="/admin/applications/$applicationId/members"
              params={{ applicationId: application.id }}
              className="rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted"
            >
              <Users className="mb-2 size-4 text-muted-foreground" />
              <span className="block text-lg font-semibold">
                {application.memberCount}
              </span>
              <span className="text-xs text-muted-foreground">Members</span>
            </Link>
          </div>
        </CardContent>

        <CardFooter className="justify-between gap-3 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Created {new Date(application.createdAt).toLocaleDateString()}
          </span>
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link
                to="/admin/applications/$applicationId/clients"
                params={{ applicationId: application.id }}
              />
            }
          >
            Manage clients
            <ArrowRight />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div
      aria-label={`Application ${application.name}`}
      className={cn(
        "rounded-md border bg-background",
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
            canManage={props.canManage}
            onView={props.onView}
            onEdit={props.onEdit}
            onLifecycle={props.onLifecycle}
          />
        </div>
      </div>
    </div>
  );
}
