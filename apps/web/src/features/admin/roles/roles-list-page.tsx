import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Permissions } from "@rbac";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
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
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { Route as RootRoute } from "@/routes/__root";
import { CreateRoleDialog } from "./create-role-dialog";
import type { AdminRoleSummary } from "./types";

export function RolesListPage() {
  const { session } = RootRoute.useRouteContext();
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const canManage = sessionHasPermission(
    session?.permissions ?? [],
    Permissions.AdminRolesManage,
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.roles.list(),
    queryFn: async () => {
      const { data, error } = await client.admin.roles.get();
      if (error) {
        throw new Error("Failed to load roles");
      }
      return data as AdminRoleSummary[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: {
      slug: string;
      name: string;
      permissions?: string[];
    }) => {
      const { data, error } = await client.admin.roles.post(input);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Role created");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all() });
      setCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to create role"),
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage role definitions and permission assignments.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Customized</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  Loading roles...
                </TableCell>
              </TableRow>
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/admin/roles/$roleId"
                      params={{ roleId: role.id }}
                      className="hover:underline"
                    >
                      {role.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{role.slug}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {role.isProtected ? (
                        <Badge variant="destructive">Protected</Badge>
                      ) : null}
                      {role.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{role.permissionCount}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell>
                    {role.customizedAt
                      ? new Date(role.customizedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(input) => createMutation.mutate(input)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
