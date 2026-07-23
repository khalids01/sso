import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  KeyRound,
  Link2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationClientsResponse,
} from "../../types";
import type { LifecycleFilter, PendingAction } from "../../page-types";
import { StatusBadge, UrlList } from "../../components/ui-controls";

export function ApplicationClientsList(props: {
  application: AdminApplication;
  filter: LifecycleFilter;
  canEdit: boolean;
  canManage: boolean;
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
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading clients...
      </div>
    );
  }

  if (clientsQuery.isError) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-destructive">
        Failed to load clients.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        No {props.filter === "archived" ? "archived" : "current"} clients.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const lifecycleLabel =
          props.filter === "current" ? `Archive ${item.name}` : `Restore ${item.name}`;
        const actions = [
          {
            label: `View ${item.name}`,
            icon: Eye,
            disabled: false,
            onClick: () => props.onView(item),
          },
          {
            label: props.canEdit
              ? `Edit ${item.name}`
              : "Editing is unavailable for this client",
            ariaLabel: `Edit ${item.name}`,
            icon: Pencil,
            disabled: !props.canEdit,
            onClick: () => props.onEdit(item),
          },
          {
            label: lifecycleLabel,
            icon: props.filter === "current" ? Archive : RotateCcw,
            disabled: !props.canManage,
            onClick: () =>
              props.onLifecycle({
                type:
                  props.filter === "current"
                    ? "archive-client"
                    : "restore-client",
                application: props.application,
                client: item,
              }),
          },
        ];

        return (
          <Card
          key={item.id}
          aria-label={`Client ${item.name}`}
          className="min-h-64 transition-colors hover:ring-foreground/20"
        >
          <CardHeader>
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{item.name}</CardTitle>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {item.clientId}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{item.clientType}</Badge>
              <StatusBadge status={item.status} />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Link2 className="size-3.5 text-muted-foreground" />
                Redirect URIs
              </div>
              <UrlList items={item.redirectUris} />
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3 bg-muted/20">
            <div className="min-w-0 text-xs text-muted-foreground">
              <span className="block truncate">
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </span>
              <span>
                {item.allowedOrigins.length}{" "}
                {item.allowedOrigins.length === 1 ? "origin" : "origins"}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.ariaLabel ?? action.label}
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={action.disabled}
                    title={action.label}
                    aria-label={action.ariaLabel ?? action.label}
                    onClick={action.onClick}
                  >
                    <Icon />
                  </Button>
                );
              })}
            </div>
          </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
