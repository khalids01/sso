import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminApplication } from "../types";
import { StatusBadge } from "./ui-controls";

export function ApplicationManagementHeader({
  application,
  section,
}: {
  application: AdminApplication;
  section: "clients" | "members";
}) {
  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        className="-ml-3 gap-2"
        nativeButton={false}
        render={<Link to="/admin/applications" />}
      >
        <ArrowLeft className="h-4 w-4" />
        Applications
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
              {application.name}
            </h1>
            <StatusBadge status={application.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {application.slug}
          </p>
        </div>
      </div>

      <nav className="flex gap-1 border-b" aria-label="Application sections">
        {(["clients", "members"] as const).map((item) => (
          <Link
            key={item}
            to={`/admin/applications/$applicationId/${item}`}
            params={{ applicationId: application.id }}
            className={cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium capitalize text-muted-foreground transition-colors hover:text-foreground",
              section === item && "border-primary text-foreground",
            )}
          >
            {item}
          </Link>
        ))}
      </nav>
    </div>
  );
}
