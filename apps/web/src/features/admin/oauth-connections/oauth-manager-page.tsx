import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Permissions } from "@sso/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/constants/query-keys";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import {
  createOAuthConnection,
  runOAuthConnectionLifecycle,
  updateOAuthConnection,
} from "./crud";
import { OAuthConnectionForm } from "./oauth-connection-form";
import type {
  OAuthConnection,
  OAuthConnectionInput,
  OAuthConnectionsResponse,
} from "./types";

type Filter = "current" | "archived";

const providerLabels = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook",
  linkedin: "LinkedIn",
} as const;

export function OAuthManagerPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const canManage = sessionHasPermission(
    session?.permissions ?? [],
    Permissions.AdminOAuthConnectionsManage,
  );
  const [filter, setFilter] = useState<Filter>("current");
  const [formConnection, setFormConnection] =
    useState<OAuthConnection | null | undefined>(undefined);
  const [viewConnection, setViewConnection] =
    useState<OAuthConnection | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    connection: OAuthConnection;
    action: "archive" | "restore" | "delete";
  } | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.oauthConnections.list(filter),
    queryFn: async () => {
      const { data, error } = await client.admin["oauth-connections"].get({
        query: { page: 1, limit: 100, filter },
      });
      if (error) throw error;
      return data as OAuthConnectionsResponse;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.oauthConnections.all(),
    });

  const createMutation = useMutation({
    mutationFn: createOAuthConnection,
    onSuccess: () => {
      toast.success("OAuth connection created");
      setFormConnection(undefined);
      invalidate();
    },
    onError: () => toast.error("Could not create the OAuth connection"),
  });
  const updateMutation = useMutation({
    mutationFn: updateOAuthConnection,
    onSuccess: () => {
      toast.success("OAuth connection updated");
      setFormConnection(undefined);
      invalidate();
    },
    onError: () => toast.error("Could not update the OAuth connection"),
  });
  const lifecycleMutation = useMutation({
    mutationFn: runOAuthConnectionLifecycle,
    onSuccess: (_data, variables) => {
      toast.success(
        variables.action === "delete"
          ? "OAuth connection permanently deleted"
          : variables.action === "archive"
            ? "OAuth connection archived"
            : "OAuth connection restored",
      );
      setPendingAction(null);
      setViewConnection(null);
      invalidate();
    },
    onError: () => toast.error("OAuth connection action failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            OAuth Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable upstream OAuth connections for your applications.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="inline-flex rounded-md border bg-muted/30 p-1">
            {(["current", "archived"] as const).map((item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "secondary" : "ghost"}
                onClick={() => setFilter(item)}
              >
                {item === "current" ? "Current" : "Archived"}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={listQuery.isFetching}
            onClick={() => listQuery.refetch()}
          >
            <RefreshCw
              className={cn("size-4", listQuery.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
          {canManage ? (
            <Button onClick={() => setFormConnection(null)}>
              <Plus className="size-4" />
              Add connection
            </Button>
          ) : null}
        </div>
      </div>

      {listQuery.isLoading ? (
        <EmptyState>Loading OAuth connections...</EmptyState>
      ) : listQuery.isError ? (
        <EmptyState destructive>Failed to load OAuth connections.</EmptyState>
      ) : !listQuery.data?.items.length ? (
        <EmptyState>
          No {filter === "archived" ? "archived" : "current"} OAuth connections.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listQuery.data.items.map((connection) => {
            const actions = (
              filter === "archived"
                ? [
                    {
                      id: "view",
                      label: "View",
                      icon: Eye,
                      onClick: () => setViewConnection(connection),
                    },
                    ...(canManage
                      ? [
                          {
                            id: "restore",
                            label: "Restore",
                            icon: RotateCcw,
                            onClick: () =>
                              setPendingAction({
                                connection,
                                action: "restore",
                              }),
                          },
                        ]
                      : []),
                  ]
                : [
                    {
                      id: "view",
                      label: "View",
                      icon: Eye,
                      onClick: () => setViewConnection(connection),
                    },
                    ...(canManage
                      ? [
                          {
                            id: "edit",
                            label: "Edit",
                            icon: Pencil,
                            onClick: () => setFormConnection(connection),
                          },
                          {
                            id: "archive",
                            label: "Archive",
                            icon: Archive,
                            onClick: () =>
                              setPendingAction({
                                connection,
                                action: "archive",
                              }),
                          },
                        ]
                      : []),
                  ]
            ) as Array<{
              id: string;
              label: string;
              icon: typeof Eye;
              onClick: () => void;
            }>;

            return (
              <Card key={connection.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate">
                        {connection.name}
                      </CardTitle>
                      <CardDescription>
                        {providerLabels[connection.provider]}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        connection.status === "active"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {connection.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Client ID</p>
                    <p className="truncate font-mono text-xs">
                      {connection.clientId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Applications</p>
                      <p className="font-medium">{connection.applicationCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Linked accounts
                      </p>
                      <p className="font-medium">{connection.accountCount}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="gap-2 border-t bg-muted/20">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      size="icon"
                      variant="outline"
                      title={action.label}
                      aria-label={action.label}
                      onClick={action.onClick}
                    >
                      <action.icon className="size-4" />
                    </Button>
                  ))}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={formConnection !== undefined}
        onOpenChange={(open) => !open && setFormConnection(undefined)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formConnection ? "Edit OAuth connection" : "Add OAuth connection"}
            </DialogTitle>
            <DialogDescription>
              Provider credentials stay inside the SSO platform.
            </DialogDescription>
          </DialogHeader>
          {formConnection !== undefined ? (
            <OAuthConnectionForm
              connection={formConnection ?? undefined}
              isLoading={
                createMutation.isPending || updateMutation.isPending
              }
              onSubmit={(input) => {
                if (!formConnection) {
                  createMutation.mutate(input);
                  return;
                }
                const payload: Partial<
                  Omit<OAuthConnectionInput, "provider">
                > = {
                  name: input.name,
                  clientId: input.clientId,
                  status: input.status,
                  ...(input.clientSecret
                    ? { clientSecret: input.clientSecret }
                    : {}),
                };
                updateMutation.mutate({
                  id: formConnection.id,
                  payload,
                });
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewConnection)}
        onOpenChange={(open) => !open && setViewConnection(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewConnection?.name}</DialogTitle>
            <DialogDescription>
              {viewConnection
                ? `${providerLabels[viewConnection.provider]} OAuth connection`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {viewConnection ? (
            <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
              <Detail label="Status" value={viewConnection.status} />
              <Detail
                label="Credential version"
                value={String(viewConnection.credentialVersion)}
              />
              <Detail label="Client ID" value={viewConnection.clientId} mono />
              <Detail
                label="Applications"
                value={String(viewConnection.applicationCount)}
              />
              <Detail
                label="Linked accounts"
                value={String(viewConnection.accountCount)}
              />
            </dl>
          ) : null}
          {canManage && viewConnection?.status === "archived" ? (
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={
                  viewConnection.applicationCount > 0 ||
                  viewConnection.accountCount > 0
                }
                onClick={() =>
                  setPendingAction({
                    connection: viewConnection,
                    action: "delete",
                  })
                }
              >
                <Trash2 />
                Delete permanently
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => !open && setPendingAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === "delete"
                ? "Permanently delete connection?"
                : pendingAction?.action === "archive"
                  ? "Archive connection?"
                  : "Restore connection?"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === "archive"
                ? "Assigned applications will keep the assignment, but new upstream sign-ins will become unavailable."
                : pendingAction?.action === "delete"
                  ? "This action cannot be undone."
                  : "The connection will become available for new sign-ins again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button
              variant={
                pendingAction?.action === "restore" ? "default" : "destructive"
              }
              disabled={lifecycleMutation.isPending}
              onClick={() => {
                if (!pendingAction) return;
                lifecycleMutation.mutate({
                  id: pendingAction.connection.id,
                  action: pendingAction.action,
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState(props: {
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-6 py-10 text-center text-sm text-muted-foreground",
        props.destructive && "text-destructive",
      )}
    >
      {props.children}
    </div>
  );
}

function Detail(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{props.label}</dt>
      <dd className={cn("mt-1 truncate", props.mono && "font-mono text-xs")}>
        {props.value}
      </dd>
    </div>
  );
}
