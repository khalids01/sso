import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import type {
  AdminApplication,
  ApplicationMember,
  ApplicationMembersResponse,
} from "../../types";
import type { MemberFilter, PendingAction } from "../../page-types";
import { MemberActionsMenu } from "./member-actions-menu";
import { MemberStatusBadge } from "../../components/ui-controls";

export function ApplicationMembersList(props: {
  application: AdminApplication;
  filter: MemberFilter;
  onView: (member: ApplicationMember) => void;
  onLifecycle: (action: PendingAction) => void;
}) {
  const membersQuery = useQuery({
    queryKey: queryKeys.admin.applications.members(
      props.application.id,
      props.filter,
    ),
    queryFn: async () => {
      const { data, error } = await client.admin
        .applications({ id: props.application.id })
        .members.get({
          query: {
            page: 1,
            limit: 100,
            filter: props.filter,
          },
        });

      if (error) {
        throw new Error("Failed to load application members");
      }

      return data as ApplicationMembersResponse;
    },
  });

  const items = membersQuery.data?.items ?? [];

  if (membersQuery.isLoading) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Loading members...
      </div>
    );
  }

  if (membersQuery.isError) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-destructive">
        Failed to load members.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        No {props.filter === "revoked" ? "revoked" : "current"} members.
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
            <div className="truncate text-sm font-medium">{item.user.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {item.user.email}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Granted {new Date(item.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-start gap-2">
            <MemberStatusBadge status={item.status} />
            {item.user.banned ? (
              <Badge variant="destructive">banned</Badge>
            ) : null}
          </div>
          <MemberActionsMenu
            application={props.application}
            member={item}
            filter={props.filter}
            onView={() => props.onView(item)}
            onLifecycle={props.onLifecycle}
          />
        </div>
      ))}
    </div>
  );
}
