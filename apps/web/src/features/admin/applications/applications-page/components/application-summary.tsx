import { AppWindow } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { AdminApplication } from "../../types";
import { StatusBadge } from "../../components/ui-controls";

export function ApplicationSummary({
  application,
  viewMode,
}: {
  application: AdminApplication;
  viewMode: "list" | "grid";
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 flex-1 gap-3 text-left",
        viewMode === "list"
          ? "md:grid-cols-[minmax(220px,1fr)_140px_110px_110px_120px]"
          : "grid-cols-1",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <AppWindow className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">
            {application.name}
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {application.slug}
        </div>
      </div>
      <div>
        <StatusBadge status={application.status} />
      </div>
      <Link
        to="/admin/applications/$applicationId/clients"
        params={{ applicationId: application.id }}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {application.clientCount} clients
      </Link>
      <Link
        to="/admin/applications/$applicationId/members"
        params={{ applicationId: application.id }}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {application.memberCount} members
      </Link>
      <div className="text-xs text-muted-foreground">
        {new Date(application.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
