import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { CreateApplicationDialog } from "../create-application-dialog";
import { useApplicationsViewStore } from "../applications-view-store";
import type { AdminApplication, ApplicationsListResponse } from "../types";
import { ApplicationEditDialog } from "./components/application-edit-dialog";
import { ApplicationItem } from "./components/application-item";
import { ApplicationViewDialog } from "./components/application-view-dialog";
import { LifecycleConfirmDialog } from "../components/lifecycle-confirm-dialog";
import { SegmentedFilter, ViewModeToggle } from "../components/ui-controls";
import { createApplication, updateApplication } from "../crud/applications";
import {
  lifecycleSuccessMessage,
  runLifecycleAction,
  showMutationError,
} from "../lifecycle";
import type { LifecycleFilter, PendingAction } from "../page-types";

export function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const { viewMode, setViewMode } = useApplicationsViewStore();
  const [filter, setFilter] = useState<LifecycleFilter>("current");
  const [viewApplication, setViewApplication] =
    useState<AdminApplication | null>(null);
  const [editApplication, setEditApplication] =
    useState<AdminApplication | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const applicationsQuery = useQuery({
    queryKey: queryKeys.admin.applications.list(filter),
    queryFn: async () => {
      const { data, error } = await client.admin.applications.get({
        query: { page: 1, limit: 100, filter },
      });

      if (error) throw new Error("Failed to load applications");
      return data as ApplicationsListResponse;
    },
  });

  const applications = applicationsQuery.data?.items ?? [];
  const invalidateApplications = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.applications.all(),
    });

  const createApplicationMutation = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      toast.success("Application created");
      invalidateApplications();
    },
    onError: showMutationError("Failed to create application"),
  });

  const updateApplicationMutation = useMutation({
    mutationFn: updateApplication,
    onSuccess: () => {
      toast.success("Application updated");
      invalidateApplications();
    },
    onError: showMutationError("Failed to update application"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: runLifecycleAction,
    onSuccess: (_result, action) => {
      toast.success(lifecycleSuccessMessage(action));
      invalidateApplications();
      setPendingAction(null);
    },
    onError: showMutationError("Action failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage apps that use SSO and open their clients or members.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SegmentedFilter value={filter} onChange={setFilter} />
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button
            variant="outline"
            className="gap-2"
            disabled={applicationsQuery.isFetching}
            onClick={() => applicationsQuery.refetch()}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                applicationsQuery.isFetching && "animate-spin",
              )}
            />
            Refresh
          </Button>
          <CreateApplicationDialog
            isLoading={createApplicationMutation.isPending}
            onCreate={(input) => createApplicationMutation.mutate(input)}
          />
        </div>
      </div>

      {applicationsQuery.isLoading ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
          Loading applications...
        </div>
      ) : applicationsQuery.isError ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-destructive">
          Failed to load applications.
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
          No {filter === "archived" ? "archived" : "current"} applications
          found.
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "rounded-md border",
          )}
        >
          {applications.map((application) => (
            <ApplicationItem
              key={application.id}
              application={application}
              filter={filter}
              viewMode={viewMode}
              onView={() => setViewApplication(application)}
              onEdit={() => setEditApplication(application)}
              onLifecycle={setPendingAction}
            />
          ))}
        </div>
      )}

      <ApplicationViewDialog
        application={viewApplication}
        onOpenChange={(open) => !open && setViewApplication(null)}
      />
      <ApplicationEditDialog
        application={editApplication}
        isLoading={updateApplicationMutation.isPending}
        onOpenChange={(open) => !open && setEditApplication(null)}
        onSubmit={(payload) => {
          if (!editApplication) return;
          updateApplicationMutation.mutate({ id: editApplication.id, payload });
          setEditApplication(null);
        }}
      />
      <LifecycleConfirmDialog
        action={pendingAction}
        isLoading={lifecycleMutation.isPending}
        onOpenChange={(open) => !open && setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) lifecycleMutation.mutate(pendingAction);
        }}
      />
    </div>
  );
}
