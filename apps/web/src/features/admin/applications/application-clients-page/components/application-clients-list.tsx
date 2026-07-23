import { useQuery } from "@tanstack/react-query";
import { KeyRound, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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
import { ClientActionsMenu } from "./client-actions-menu";
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
      {items.map((item) => (
        <Card
          key={item.id}
          aria-label={`Client ${item.name}`}
          className="min-h-64 transition-colors hover:ring-foreground/20"
        >
          <CardHeader className="grid-cols-[1fr_auto] gap-3">
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
            <CardAction>
              <ClientActionsMenu
                application={props.application}
                client={item}
                filter={props.filter}
                canEdit={props.canEdit}
                canManage={props.canManage}
                onView={() => props.onView(item)}
                onEdit={() => props.onEdit(item)}
                onLifecycle={props.onLifecycle}
              />
            </CardAction>
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
            <span className="text-xs text-muted-foreground">
              Updated {new Date(item.updatedAt).toLocaleDateString()}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.allowedOrigins.length}{" "}
              {item.allowedOrigins.length === 1 ? "origin" : "origins"}
            </span>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
