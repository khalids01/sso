import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { CreateApplicationDialog } from "../create-application-dialog";
import { useApplicationsViewStore } from "../applications-view-store";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationMember,
  ApplicationsListResponse,
} from "../types";
import { ApplicationEditDialog } from "./components/application-edit-dialog";
import { ApplicationViewDialog } from "./components/application-view-dialog";
import { ApplicationAccordionItem } from "./components/application-item";
import { ClientEditDialog } from "./components/client-edit-dialog";
import { ClientViewDialog } from "./components/client-view-dialog";
import { CreateClientDialog } from "./components/create-client-dialog";
import { LifecycleConfirmDialog } from "./components/lifecycle-confirm-dialog";
import { GrantAccessDialog } from "./components/grant-access-dialog";
import { MemberViewDialog } from "./components/member-view-dialog";
import { SegmentedFilter, ViewModeToggle } from "./components/ui-controls";
import { createApplication, updateApplication } from "./crud/applications";
import { createClient, updateClient } from "./crud/clients";
import { grantMember } from "./crud/members";
import {
  invalidateApplicationClients,
  invalidateApplicationMembers,
  lifecycleSuccessMessage,
  runLifecycleAction,
  showMutationError,
} from "./lifecycle";
import type {
  LifecycleFilter,
  MemberFilter,
  PendingAction,
} from "./page-types";

export function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const { viewMode, setViewMode } = useApplicationsViewStore();
  const [filter, setFilter] = useState<LifecycleFilter>("current");
  const [clientFilter, setClientFilter] = useState<LifecycleFilter>("current");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("current");
  const [viewApplication, setViewApplication] =
    useState<AdminApplication | null>(null);
  const [editApplication, setEditApplication] =
    useState<AdminApplication | null>(null);
  const [createClientFor, setCreateClientFor] =
    useState<AdminApplication | null>(null);
  const [viewClient, setViewClient] = useState<ApplicationClient | null>(null);
  const [viewMember, setViewMember] = useState<ApplicationMember | null>(null);
  const [grantAccessFor, setGrantAccessFor] = useState<AdminApplication | null>(
    null,
  );
  const [editClient, setEditClient] = useState<{
    application: AdminApplication;
    client: ApplicationClient;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const applicationsQuery = useQuery({
    queryKey: queryKeys.admin.applications.list(filter),
    queryFn: async () => {
      const { data, error } = await client.admin.applications.get({
        query: {
          page: 1,
          limit: 100,
          filter,
        },
      });

      if (error) {
        throw new Error("Failed to load applications");
      }

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

  const createClientMutation = useMutation({
    mutationFn: createClient,
    onSuccess: (_client, input) => {
      toast.success("Client created");
      invalidateApplicationClients(queryClient, input.applicationId);
      invalidateApplications();
    },
    onError: showMutationError("Failed to create client"),
  });

  const updateClientMutation = useMutation({
    mutationFn: updateClient,
    onSuccess: (_client, input) => {
      toast.success("Client updated");
      invalidateApplicationClients(queryClient, input.applicationId);
    },
    onError: showMutationError("Failed to update client"),
  });

  const grantMemberMutation = useMutation({
    mutationFn: grantMember,
    onSuccess: (_member, input) => {
      toast.success("Application access granted");
      invalidateApplicationMembers(queryClient, input.applicationId);
      setGrantAccessFor(null);
    },
    onError: showMutationError("Failed to grant access"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: runLifecycleAction,
    onSuccess: (_result, action) => {
      toast.success(lifecycleSuccessMessage(action));
      invalidateApplications();
      if ("application" in action) {
        invalidateApplicationClients(queryClient, action.application.id);
        invalidateApplicationMembers(queryClient, action.application.id);
      }
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
            Manage apps and clients that use SSO.
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
      ) : applications.length === 0 ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
          No {filter === "archived" ? "archived" : "current"} applications
          found.
        </div>
      ) : (
        <Accordion
          className={cn(
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "rounded-md border",
          )}
        >
          {applications.map((application) => (
            <ApplicationAccordionItem
              key={application.id}
              application={application}
              filter={filter}
              clientFilter={clientFilter}
              memberFilter={memberFilter}
              viewMode={viewMode}
              onClientFilterChange={setClientFilter}
              onMemberFilterChange={setMemberFilter}
              onView={() => setViewApplication(application)}
              onEdit={() => setEditApplication(application)}
              onCreateClient={() => setCreateClientFor(application)}
              onGrantAccess={() => setGrantAccessFor(application)}
              onLifecycle={setPendingAction}
              onViewClient={setViewClient}
              onViewMember={setViewMember}
              onEditClient={(clientItem) =>
                setEditClient({ application, client: clientItem })
              }
            />
          ))}
        </Accordion>
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
      <CreateClientDialog
        application={createClientFor}
        isLoading={createClientMutation.isPending}
        onOpenChange={(open) => !open && setCreateClientFor(null)}
        onSubmit={(payload) => {
          if (!createClientFor) return;
          createClientMutation.mutate({
            applicationId: createClientFor.id,
            payload,
          });
        }}
      />
      <ClientViewDialog
        client={viewClient}
        onOpenChange={(open) => !open && setViewClient(null)}
      />
      <MemberViewDialog
        member={viewMember}
        onOpenChange={(open) => !open && setViewMember(null)}
      />
      <GrantAccessDialog
        application={grantAccessFor}
        isLoading={grantMemberMutation.isPending}
        onOpenChange={(open) => !open && setGrantAccessFor(null)}
        onGrant={(userId) => {
          if (!grantAccessFor) return;
          grantMemberMutation.mutate({
            applicationId: grantAccessFor.id,
            userId,
          });
        }}
      />
      <ClientEditDialog
        value={editClient}
        isLoading={updateClientMutation.isPending}
        onOpenChange={(open) => !open && setEditClient(null)}
        onSubmit={(payload) => {
          if (!editClient) return;
          updateClientMutation.mutate({
            applicationId: editClient.application.id,
            clientId: editClient.client.id,
            payload,
          });
          setEditClient(null);
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
