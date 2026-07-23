import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  canManage: boolean;
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
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="px-4">Member</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Granted</TableHead>
            <TableHead className="hidden lg:table-cell">Updated</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} aria-label={`Member ${item.user.email}`}>
              <TableCell className="min-w-56 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={item.user.image ?? undefined} />
                    <AvatarFallback>
                      {item.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.user.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.user.email}
                    </div>
                    <div className="mt-1 flex gap-1 sm:hidden">
                      <MemberStatusBadge status={item.status} />
                      {item.user.banned ? (
                        <Badge variant="destructive">banned</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex gap-2">
                  <MemberStatusBadge status={item.status} />
                  {item.user.banned ? (
                    <Badge variant="destructive">banned</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {new Date(item.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {new Date(item.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="pr-3 text-right">
                <MemberActionsMenu
                  application={props.application}
                  member={item}
                  filter={props.filter}
                  canManage={props.canManage}
                  onView={() => props.onView(item)}
                  onLifecycle={props.onLifecycle}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
