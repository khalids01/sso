import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import type {
  AdminApplication,
  ApplicationClient,
  ApplicationClientsResponse,
} from "../../types";
import type { LifecycleFilter, PendingAction } from "../page-types";
import { ClientActionsMenu } from "./client-actions-menu";
import { StatusBadge, UrlList } from "./ui-controls";

export function ApplicationClientsList(props: {
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
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading clients...
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
