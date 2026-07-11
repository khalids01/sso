import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppWindow,
  EllipsisVertical,
  Grid2X2,
  List,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { ApplicationClientForm } from "./client.form";
import { CreateApplicationClientDialog } from "./create-application-client-dialog";
import { CreateApplicationDialog } from "./create-application-dialog";
import { ApplicationForm } from "./application.form";
import { useApplicationsViewStore } from "./applications-view-store";
import type { CreateApplicationClientInput } from "./schema";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationClientsResponse,
  ApplicationStatus,
  ApplicationsListResponse,
} from "./types";

type LifecycleFilter = "current" | "archived";
type PendingAction =
  | { type: "archive-application"; application: AdminApplication }
  | { type: "restore-application"; application: AdminApplication }
  | { type: "delete-application"; application: AdminApplication }
  | {
      type: "archive-client";
      application: AdminApplication;
      client: ApplicationClient;
    }
  | {
      type: "restore-client";
      application: AdminApplication;
      client: ApplicationClient;
    }
  | {
      type: "delete-client";
      application: AdminApplication;
      client: ApplicationClient;
    };

const statusVariant: Record<
  ApplicationStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  disabled: "secondary",
  archived: "destructive",
};

export function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const { viewMode, setViewMode } = useApplicationsViewStore();
  const [filter, setFilter] = useState<LifecycleFilter>("current");
  const [clientFilter, setClientFilter] = useState<LifecycleFilter>("current");
  const [viewApplication, setViewApplication] = useState<AdminApplication | null>(
    null,
  );
  const [editApplication, setEditApplication] = useState<AdminApplication | null>(
    null,
  );
  const [createClientFor, setCreateClientFor] = useState<AdminApplication | null>(
    null,
  );
  const [viewClient, setViewClient] = useState<ApplicationClient | null>(null);
  const [editClient, setEditClient] = useState<{
    application: AdminApplication;
    client: ApplicationClient;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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
    mutationFn: async (input: {
      name: string;
      slug?: string;
      description?: string;
      status: ApplicationStatus;
    }) => {
      const { data, error } = await client.admin.applications.post(input);
      if (error) throw error;
      return data as AdminApplication;
    },
    onSuccess: () => {
      toast.success("Application created");
      invalidateApplications();
    },
    onError: showMutationError("Failed to create application"),
  });

  const updateApplicationMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      payload: {
        name?: string;
        slug?: string;
        description?: string;
        status?: ApplicationStatus;
      };
    }) => {
      const { data, error } = await client.admin
        .applications({ id: input.id })
        .patch(input.payload);
      if (error) throw error;
      return data as AdminApplication;
    },
    onSuccess: () => {
      toast.success("Application updated");
      invalidateApplications();
    },
    onError: showMutationError("Failed to update application"),
  });

  const createClientMutation = useMutation({
    mutationFn: async (input: {
      applicationId: string;
      payload: CreateApplicationClientInput;
    }) => {
      const { data, error } = await client.admin
        .applications({ id: input.applicationId })
        .clients.post(input.payload);
      if (error) throw error;
      return data as ApplicationClient;
    },
    onSuccess: (_client, input) => {
      toast.success("Client created");
      invalidateApplicationClients(queryClient, input.applicationId);
      invalidateApplications();
    },
    onError: showMutationError("Failed to create client"),
  });

  const updateClientMutation = useMutation({
    mutationFn: async (input: {
      applicationId: string;
      clientId: string;
      payload: CreateApplicationClientInput;
    }) => {
      const { data, error } = await client.admin
        .applications({ id: input.applicationId })
        .clients({ clientId: input.clientId })
        .patch(input.payload);
      if (error) throw error;
      return data as ApplicationClient;
    },
    onSuccess: (_client, input) => {
      toast.success("Client updated");
      invalidateApplicationClients(queryClient, input.applicationId);
    },
    onError: showMutationError("Failed to update client"),
  });

  const lifecycleMutation = useMutation({
    mutationFn: runLifecycleAction,
    onSuccess: (_result, action) => {
      toast.success(lifecycleSuccessMessage(action));
      invalidateApplications();
      if ("application" in action) {
        invalidateApplicationClients(queryClient, action.application.id);
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
          No {filter === "archived" ? "archived" : "current"} applications found.
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
              viewMode={viewMode}
              onClientFilterChange={setClientFilter}
              onView={() => setViewApplication(application)}
              onEdit={() => setEditApplication(application)}
              onCreateClient={() => setCreateClientFor(application)}
              onLifecycle={setPendingAction}
              onViewClient={setViewClient}
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
      <Dialog
        open={Boolean(createClientFor)}
        onOpenChange={(open) => !open && setCreateClientFor(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create client</DialogTitle>
            <DialogDescription>
              {createClientFor
                ? `Add a browser client for ${createClientFor.name}.`
                : "Add a browser client."}
            </DialogDescription>
          </DialogHeader>
          <ApplicationClientForm
            isLoading={createClientMutation.isPending}
            resetKey={createClientFor?.id ?? "closed"}
            submitLabel="Create client"
            loadingLabel="Creating..."
            onSubmit={(payload) => {
              if (!createClientFor) return;
              createClientMutation.mutate({
                applicationId: createClientFor.id,
                payload,
              });
            }}
            onSubmitted={() => setCreateClientFor(null)}
          />
        </DialogContent>
      </Dialog>
      <ClientViewDialog
        client={viewClient}
        onOpenChange={(open) => !open && setViewClient(null)}
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

function ApplicationAccordionItem(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  clientFilter: LifecycleFilter;
  viewMode: "list" | "grid";
  onClientFilterChange: (filter: LifecycleFilter) => void;
  onView: () => void;
  onEdit: () => void;
  onCreateClient: () => void;
  onLifecycle: (action: PendingAction) => void;
  onViewClient: (client: ApplicationClient) => void;
  onEditClient: (client: ApplicationClient) => void;
}) {
  const { application, viewMode } = props;

  return (
    <AccordionItem
      value={application.id}
      className={cn(
        "rounded-md border bg-background",
        viewMode === "list" && "rounded-none border-x-0 border-t-0 last:border-b-0",
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

function ApplicationSummary({
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
          ? "md:grid-cols-[minmax(220px,1fr)_160px_120px_120px]"
          : "grid-cols-1",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <AppWindow className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{application.name}</span>
        </div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {application.slug}
        </div>
      </div>
      <div>
        <StatusBadge status={application.status} />
      </div>
      <div className="text-xs text-muted-foreground">
        {application.clientCount} clients
      </div>
      <div className="text-xs text-muted-foreground">
        {new Date(application.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

function ApplicationClientsList(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  onView: (client: ApplicationClient) => void;
  onEdit: (client: ApplicationClient) => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  const clientsQuery = useQuery({
    queryKey: queryKeys.admin.applications.clients(
      props.application.id,
      props.filter,
    ),
    queryFn: async () => {
      const { data, error } = await client.admin
        .applications({ id: props.application.id })
        .clients.get({ query: { filter: props.filter } });

      if (error) {
        throw new Error("Failed to load application clients");
      }

      return data as ApplicationClientsResponse;
    },
  });

  const items = clientsQuery.data?.items ?? [];

  if (clientsQuery.isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">Loading clients...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        No {props.filter === "archived" ? "archived" : "current"} clients.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border">
      {items.map((item) => (
        <div
          key={item.id}
          className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_auto_auto]"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{item.name}</div>
            <div className="break-all font-mono text-xs text-muted-foreground">
              {item.clientId}
            </div>
          </div>
          <div className="min-w-0">
            <UrlList items={item.redirectUris} />
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline">{item.clientType}</Badge>
            <StatusBadge status={item.status} />
          </div>
          <ClientActionsMenu
            application={props.application}
            client={item}
            filter={props.filter}
            onView={() => props.onView(item)}
            onEdit={() => props.onEdit(item)}
            onLifecycle={props.onLifecycle}
          />
        </div>
      ))}
    </div>
  );
}

function ApplicationActionsMenu(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  onView: () => void;
  onEdit: () => void;
  onCreateClient: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(event) => event.stopPropagation()}
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEdit}>Edit</DropdownMenuItem>
        {props.filter === "current" ? (
          <>
            <DropdownMenuItem onClick={props.onCreateClient}>
              Create new client
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "archive-application",
                  application: props.application,
                })
              }
            >
              Archive
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                props.onLifecycle({
                  type: "restore-application",
                  application: props.application,
                })
              }
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "delete-application",
                  application: props.application,
                })
              }
            >
              Permanent delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientActionsMenu(props: {
  application: AdminApplication;
  client: ApplicationClient;
  filter: LifecycleFilter;
  onView: () => void;
  onEdit: () => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={props.onView}>View</DropdownMenuItem>
        <DropdownMenuItem onClick={props.onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuSeparator />
        {props.filter === "current" ? (
          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              props.onLifecycle({
                type: "archive-client",
                application: props.application,
                client: props.client,
              })
            }
          >
            Archive
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() =>
                props.onLifecycle({
                  type: "restore-client",
                  application: props.application,
                  client: props.client,
                })
              }
            >
              Restore
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                props.onLifecycle({
                  type: "delete-client",
                  application: props.application,
                  client: props.client,
                })
              }
            >
              Permanent delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentedFilter({
  value,
  onChange,
}: {
  value: LifecycleFilter;
  onChange: (value: LifecycleFilter) => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-1">
      <Button
        type="button"
        size="sm"
        variant={value === "current" ? "secondary" : "ghost"}
        onClick={() => onChange("current")}
      >
        Current
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "archived" ? "secondary" : "ghost"}
        onClick={() => onChange("archived")}
      >
        Archived
      </Button>
    </div>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: "list" | "grid";
  onChange: (value: "list" | "grid") => void;
}) {
  return (
    <div className="inline-flex rounded-md border bg-background p-1">
      <Button
        type="button"
        size="icon-sm"
        variant={value === "list" ? "secondary" : "ghost"}
        onClick={() => onChange("list")}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={value === "grid" ? "secondary" : "ghost"}
        onClick={() => onChange("grid")}
      >
        <Grid2X2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ApplicationViewDialog({
  application,
  onOpenChange,
}: {
  application: AdminApplication | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Application details</DialogTitle>
          <DialogDescription>{application?.name}</DialogDescription>
        </DialogHeader>
        {application ? (
          <InfoGrid
            rows={[
              ["Name", application.name],
              ["Slug", application.slug],
              ["Status", application.status],
              ["Description", application.description ?? "None"],
              ["Logo URL", application.logoUrl ?? "None"],
              ["Homepage URL", application.homepageUrl ?? "None"],
              ["Clients", String(application.clientCount)],
              ["Created", new Date(application.createdAt).toLocaleString()],
              ["Updated", new Date(application.updatedAt).toLocaleString()],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ApplicationEditDialog(props: {
  application: AdminApplication | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ApplicationStatus;
  }) => void;
}) {
  const initialValues = useMemo(
    () =>
      props.application
        ? {
            name: props.application.name,
            slug: props.application.slug,
            description: props.application.description ?? "",
            status: props.application.status,
          }
        : undefined,
    [props.application],
  );

  return (
    <Dialog open={Boolean(props.application)} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit application</DialogTitle>
          <DialogDescription>{props.application?.name}</DialogDescription>
        </DialogHeader>
        {initialValues ? (
          <ApplicationForm
            initialValues={initialValues}
            isLoading={props.isLoading}
            resetKey={props.application?.id ?? "closed"}
            onSubmit={props.onSubmit}
            onSubmitted={() => props.onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ClientViewDialog({
  client,
  onOpenChange,
}: {
  client: ApplicationClient | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(client)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Client details</DialogTitle>
          <DialogDescription>{client?.name}</DialogDescription>
        </DialogHeader>
        {client ? (
          <InfoGrid
            rows={[
              ["Name", client.name],
              ["Client ID", client.clientId],
              ["Type", client.clientType],
              ["Status", client.status],
              ["Redirect URIs", client.redirectUris.join("\n") || "None"],
              ["Allowed origins", client.allowedOrigins.join("\n") || "None"],
              ["Created", new Date(client.createdAt).toLocaleString()],
              ["Updated", new Date(client.updatedAt).toLocaleString()],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ClientEditDialog(props: {
  value: { application: AdminApplication; client: ApplicationClient } | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateApplicationClientInput) => void;
}) {
  const initialValues = useMemo(
    () =>
      props.value
        ? {
            name: props.value.client.name,
            status: props.value.client.status,
            redirectUris: props.value.client.redirectUris.length
              ? props.value.client.redirectUris
              : [""],
            allowedOrigins: props.value.client.allowedOrigins.length
              ? props.value.client.allowedOrigins
              : [""],
          }
        : undefined,
    [props.value],
  );

  return (
    <Dialog open={Boolean(props.value)} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit client</DialogTitle>
          <DialogDescription>{props.value?.application.name}</DialogDescription>
        </DialogHeader>
        {initialValues ? (
          <ApplicationClientForm
            initialValues={initialValues}
            isLoading={props.isLoading}
            resetKey={props.value?.client.id ?? "closed"}
            onSubmit={props.onSubmit}
            onSubmitted={() => props.onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LifecycleConfirmDialog(props: {
  action: PendingAction | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const copy = props.action ? lifecycleCopy(props.action) : null;

  return (
    <AlertDialog open={Boolean(props.action)} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={copy?.destructive ? "destructive" : "default"}
            disabled={props.isLoading}
            onClick={props.onConfirm}
          >
            {props.isLoading ? "Working..." : copy?.actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[140px_1fr]">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

function UrlList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">No redirect URIs</span>;
  }

  return (
    <div className="grid gap-1">
      {items.slice(0, 2).map((item) => (
        <code key={item} className="break-all text-xs">
          {item}
        </code>
      ))}
      {items.length > 2 ? (
        <span className="text-xs text-muted-foreground">
          +{items.length - 2} more
        </span>
      ) : null}
    </div>
  );
}

function lifecycleCopy(action: PendingAction) {
  const name = "client" in action ? action.client.name : action.application.name;
  const noun = "client" in action ? "client" : "application";

  if (action.type.startsWith("archive")) {
    return {
      title: `Archive ${noun}`,
      description: `${name} will move to Archived and can be restored later.`,
      actionLabel: "Archive",
      destructive: true,
    };
  }

  if (action.type.startsWith("restore")) {
    return {
      title: `Restore ${noun}`,
      description: `${name} will move back to Current with active status.`,
      actionLabel: "Restore",
      destructive: false,
    };
  }

  return {
    title: `Permanently delete ${noun}`,
    description: `${name} will be permanently deleted. This cannot be undone.`,
    actionLabel: "Permanent delete",
    destructive: true,
  };
}

function lifecycleSuccessMessage(action: PendingAction) {
  if (action.type.startsWith("archive")) return "Archived";
  if (action.type.startsWith("restore")) return "Restored";
  return "Permanently deleted";
}

async function runLifecycleAction(action: PendingAction) {
  if (action.type === "archive-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .archive.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "restore-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .restore.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "delete-application") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .delete();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "archive-client") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .clients({ clientId: action.client.id })
      .archive.post();
    if (response.error) throw response.error;
    return response.data;
  }

  if (action.type === "restore-client") {
    const response = await client.admin
      .applications({ id: action.application.id })
      .clients({ clientId: action.client.id })
      .restore.post();
    if (response.error) throw response.error;
    return response.data;
  }

  const response = await client.admin
    .applications({ id: action.application.id })
    .clients({ clientId: action.client.id })
    .delete();
  if (response.error) throw response.error;
  return response.data;
}

function invalidateApplicationClients(
  queryClient: ReturnType<typeof useQueryClient>,
  applicationId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.admin.applications.clientsRoot(applicationId),
  });
}

function showMutationError(fallback: string) {
  return (error: any) => {
    toast.error(String(error?.value?.message || error?.message || fallback));
  };
}
