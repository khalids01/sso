import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppWindow, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { CreateApplicationClientDialog } from "./create-application-client-dialog";
import { CreateApplicationDialog } from "./create-application-dialog";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationClientsResponse,
  ApplicationStatus,
  ApplicationsListResponse,
} from "./types";

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
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    null,
  );

  const applicationsQuery = useQuery({
    queryKey: queryKeys.admin.applications.list(),
    queryFn: async () => {
      const { data, error } = await client.admin.applications.get({
        query: {
          page: 1,
          limit: 100,
        },
      });

      if (error) {
        throw new Error("Failed to load applications");
      }

      return data as ApplicationsListResponse;
    },
  });

  const applications = applicationsQuery.data?.items ?? [];
  const selectedApplication = useMemo(
    () =>
      applications.find((application) => application.id === selectedApplicationId) ??
      null,
    [applications, selectedApplicationId],
  );

  useEffect(() => {
    const firstApplicationId = applications[0]?.id;

    if (!firstApplicationId) {
      return;
    }

    if (!selectedApplicationId) {
      setSelectedApplicationId(firstApplicationId);
      return;
    }

    if (
      !applications.some((application) => application.id === selectedApplicationId)
    ) {
      setSelectedApplicationId(firstApplicationId);
    }
  }, [applications, selectedApplicationId]);

  const clientsQuery = useQuery({
    queryKey: queryKeys.admin.applications.clients(selectedApplicationId ?? ""),
    queryFn: async () => {
      if (!selectedApplicationId) {
        return { items: [] } satisfies ApplicationClientsResponse;
      }

      const { data, error } = await client.admin
        .applications({ id: selectedApplicationId })
        .clients.get();

      if (error) {
        throw new Error("Failed to load application clients");
      }

      return data as ApplicationClientsResponse;
    },
    enabled: Boolean(selectedApplicationId),
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      slug?: string;
      description?: string;
      status: ApplicationStatus;
    }) => {
      const { data, error } = await client.admin.applications.post(input);
      if (error) {
        throw error;
      }
      return data as AdminApplication;
    },
    onSuccess: (application) => {
      toast.success("Application created");
      setSelectedApplicationId(application.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.all(),
      });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to create application"),
      );
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      status: ApplicationStatus;
      redirectUris: string[];
      allowedOrigins?: string[];
    }) => {
      if (!selectedApplicationId) {
        throw new Error("Select an application first");
      }

      const { data, error } = await client.admin
        .applications({ id: selectedApplicationId })
        .clients.post(input);

      if (error) {
        throw error;
      }

      return data as ApplicationClient;
    },
    onSuccess: () => {
      toast.success("Client created");
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.clients(selectedApplicationId ?? ""),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.list(),
      });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to create client"),
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Register apps and browser clients that use SSO.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clients</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicationsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  Loading applications...
                </TableCell>
              </TableRow>
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  No applications registered.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => (
                <TableRow
                  key={application.id}
                  className={cn(
                    "cursor-pointer",
                    selectedApplicationId === application.id && "bg-muted/60",
                  )}
                  onClick={() => setSelectedApplicationId(application.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <AppWindow className="h-4 w-4 text-muted-foreground" />
                      {application.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {application.slug}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={application.status} />
                  </TableCell>
                  <TableCell>{application.clientCount}</TableCell>
                  <TableCell>
                    {new Date(application.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Application clients
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedApplication
                ? selectedApplication.name
                : "Select an application to view clients."}
            </p>
          </div>
          <CreateApplicationClientDialog
            disabled={!selectedApplication}
            isLoading={createClientMutation.isPending}
            onCreate={(input) => createClientMutation.mutate(input)}
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Redirect URIs</TableHead>
                <TableHead>Allowed origins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!selectedApplication ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    Select an application.
                  </TableCell>
                </TableRow>
              ) : clientsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    Loading clients...
                  </TableCell>
                </TableRow>
              ) : (clientsQuery.data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    No clients registered for this application.
                  </TableCell>
                </TableRow>
              ) : (
                clientsQuery.data?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-[240px] break-all font-mono text-xs">
                      {item.clientId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.clientType}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <UrlList items={item.redirectUris} />
                    </TableCell>
                    <TableCell>
                      <UrlList items={item.allowedOrigins} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

function UrlList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>;
  }

  return (
    <div className="grid gap-1">
      {items.map((item) => (
        <code key={item} className="break-all text-xs">
          {item}
        </code>
      ))}
    </div>
  );
}
