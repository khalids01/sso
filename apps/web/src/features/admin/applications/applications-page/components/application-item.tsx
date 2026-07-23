import { Link } from "@tanstack/react-router";
import { AppWindow, ArrowRight, KeyRound, Settings, Users } from "lucide-react";
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
import { StatusBadge } from "../../components/ui-controls";

export function ApplicationItem(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  canManage: boolean;
  onView: () => void;
  onEdit: () => void;
  onSettings: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  const { application } = props;

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
          <div className="flex items-center gap-2">
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
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label={`Authentication settings for ${application.name}`}
              onClick={props.onSettings}
            >
              <Settings />
            </Button>
          </div>
        </CardFooter>
      </Card>
  );
}
