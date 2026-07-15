import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/constants/query-keys";
import { cn } from "@/lib/utils";
import { ApplicationManagementHeader } from "../components/application-management-header";
import type { AdminApplication, ApplicationClient } from "../types";
import { ApplicationClientsList } from "./components/application-clients-list";
import { LifecycleConfirmDialog } from "../components/lifecycle-confirm-dialog";
import { SegmentedFilter } from "../components/ui-controls";
import {
  createClient,
  updateClient,
} from "../crud/clients";
import {
  ApplicationRequestError,
  getApplication,
} from "../crud/applications";
import {
  invalidateApplicationClients,
  lifecycleSuccessMessage,
  runLifecycleAction,
  showMutationError,
} from "../lifecycle";
import type {
  LifecycleFilter,
  PendingAction,
} from "../page-types";
import { ClientEditDialog } from "./components/client-edit-dialog";
import { ClientViewDialog } from "./components/client-view-dialog";
import { CreateClientDialog } from "./components/create-client-dialog";
import { useSession } from "@/providers/session-provider";
import { Permissions } from "@rbac";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";

export function ApplicationClientsPage({
  applicationId,
}: {
  applicationId: string;
}) {
  const { session } = useSession();
  const canManage = sessionHasPermission(
    session?.permissions ?? [],
    Permissions.AdminApplicationsManage,
  );
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<LifecycleFilter>("current");
  const [createFor, setCreateFor] = useState<AdminApplication | null>(null);
  const [viewClient, setViewClient] = useState<ApplicationClient | null>(null);
  const [editClient, setEditClient] = useState<{
    application: AdminApplication;
    client: ApplicationClient;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const applicationQuery = useQuery({
    queryKey: queryKeys.admin.applications.detail(applicationId),
    queryFn: () => getApplication(applicationId),
  });

  const application = applicationQuery.data;
  const isArchived = application?.status === "archived";

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (_client, input) => {
      toast.success("Client created");
      invalidateApplicationClients(queryClient, input.applicationId);
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.all(),
      });
      setCreateFor(null);
    },
    onError: showMutationError("Failed to create client"),
  });

  const updateMutation = useMutation({
    mutationFn: updateClient,
    onSuccess: (_client, input) => {
      toast.success("Client updated");
      invalidateApplicationClients(queryClient, input.applicationId);
      setEditClient(null);
    },
    onError: showMutationError("Failed to update client"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: runLifecycleAction,
    onSuccess: (_result, action) => {
      toast.success(lifecycleSuccessMessage(action));
      invalidateApplicationClients(queryClient, action.application.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.all(),
      });
      setPendingAction(null);
    },
    onError: showMutationError("Action failed"),
  });

  if (applicationQuery.isLoading) {
    return <ApplicationPageState message="Loading application..." />;
  }

  if (applicationQuery.isError || !application) {
    const notFound =
      applicationQuery.error instanceof ApplicationRequestError &&
      applicationQuery.error.status === 404;
    return (
      <ApplicationPageState
        destructive
        message={notFound ? "Application not found." : "Failed to load application."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ApplicationManagementHeader application={application} section="clients" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Technical browser login integrations for this application.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SegmentedFilter value={filter} onChange={setFilter} />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.admin.applications.clientsRoot(application.id),
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {canManage ? (
            <Button
              size="sm"
              className="gap-2"
              disabled={isArchived}
              onClick={() => setCreateFor(application)}
            >
              <Plus className="h-4 w-4" />
              Create client
            </Button>
          ) : null}
        </div>
      </div>

      {isArchived ? (
        <ArchivedApplicationNotice />
      ) : null}

      <ApplicationClientsList
        application={application}
        filter={filter}
        canEdit={canManage && !isArchived}
        canManage={canManage}
        onView={setViewClient}
        onEdit={(client) => setEditClient({ application, client })}
        onLifecycle={setPendingAction}
      />

      <CreateClientDialog
        application={createFor}
        isLoading={createMutation.isPending}
        onOpenChange={(open) => !open && setCreateFor(null)}
        onSubmit={(payload) =>
          createMutation.mutate({ applicationId: application.id, payload })
        }
      />
      <ClientViewDialog
        client={viewClient}
        onOpenChange={(open) => !open && setViewClient(null)}
      />
      <ClientEditDialog
        value={editClient}
        isLoading={updateMutation.isPending}
        onOpenChange={(open) => !open && setEditClient(null)}
        onSubmit={(payload) => {
          if (!editClient) return;
          updateMutation.mutate({
            applicationId: application.id,
            clientId: editClient.client.id,
            payload,
          });
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

function ApplicationPageState({
  message,
  destructive = false,
}: {
  message: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-6 py-12 text-center text-sm text-muted-foreground",
        destructive && "text-destructive",
      )}
    >
      {message}
    </div>
  );
}

function ArchivedApplicationNotice() {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
      This application is archived. Creation and editing are disabled, but
      lifecycle cleanup actions remain available.
    </div>
  );
}
