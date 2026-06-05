import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Permissions } from "@rbac";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loader from "@/components/loader";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { Route as RootRoute } from "@/routes/__root";
import { PermissionEditor } from "./permission-editor";
import type { AdminRoleDetail, PermissionCatalogEntry } from "./types";

export function RoleDetailPage({ roleId }: { roleId: string }) {
  const navigate = useNavigate();
  const { session } = RootRoute.useRouteContext();
  const queryClient = useQueryClient();
  const permissions = session?.permissions ?? [];
  const canUpdate = sessionHasPermission(permissions, Permissions.AdminRolesUpdate);
  const canReset = sessionHasPermission(permissions, Permissions.AdminRolesReset);
  const canManage = sessionHasPermission(permissions, Permissions.AdminRolesManage);

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: queryKeys.admin.roles.detail(roleId),
    queryFn: async () => {
      const { data, error } = await client.admin.roles({ id: roleId }).get();
      if (error) {
        throw new Error("Failed to load role");
      }
      return data as AdminRoleDetail;
    },
  });

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: queryKeys.admin.roles.permissions(),
    queryFn: async () => {
      const { data, error } = await client.admin.roles.permissions.get();
      if (error) {
        throw new Error("Failed to load permissions");
      }
      return data as PermissionCatalogEntry[];
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (role) {
      setSelected(new Set(role.permissions));
      setNameDraft(role.name);
    }
  }, [role]);

  const isReadOnly = role?.isProtected === true;
  const canEditPermissions = canUpdate && !isReadOnly;
  const canRename = canUpdate && role && !role.isSystem && !role.isProtected;
  const canResetRole = canReset && role?.isSystem && !role.isProtected;
  const canDeleteRole =
    canManage && role && !role.isSystem && !role.isProtected && role.userCount === 0;

  const hasPermissionChanges = useMemo(() => {
    if (!role) {
      return false;
    }

    if (role.permissions.length !== selected.size) {
      return true;
    }

    return role.permissions.some((permission) => !selected.has(permission));
  }, [role, selected]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.admin.roles({ id: roleId }).permissions.put({
        permissions: [...selected],
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Role permissions saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all() });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to save permissions"),
      );
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await client.admin.roles({ id: roleId }).patch({ name });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all() });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to update role"),
      );
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.admin.roles({ id: roleId }).reset.post();
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Role reset to defaults");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all() });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to reset role"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.admin.roles({ id: roleId }).delete();
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Role deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.roles.all() });
      navigate({ to: "/admin/roles" });
    },
    onError: (error: any) => {
      toast.error(
        String(error?.value?.message || error?.message || "Failed to delete role"),
      );
    },
  });

  if (roleLoading || catalogLoading) {
    return <Loader />;
  }

  if (!role || !catalog) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/roles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Link>
        <p className="text-muted-foreground">Role not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" render={<Link to="/admin/roles" />}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to roles
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{role.name}</h1>
            <p className="font-mono text-sm text-muted-foreground">{role.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {role.isProtected ? <Badge variant="destructive">Protected</Badge> : null}
            {role.isSystem ? (
              <Badge variant="secondary">System</Badge>
            ) : (
              <Badge variant="outline">Custom</Badge>
            )}
            {role.customizedAt ? (
              <Badge variant="outline">
                Customized {new Date(role.customizedAt).toLocaleDateString()}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canResetRole ? (
            <Button
              variant="outline"
              disabled={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to defaults
            </Button>
          ) : null}
          {canDeleteRole ? (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete role
            </Button>
          ) : null}
        </div>
      </div>

      {isReadOnly ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          This is a protected role. Its permissions are managed by the system catalog and
          cannot be edited here.
        </div>
      ) : null}

      {canRename ? (
        <div className="flex max-w-md items-end gap-3">
          <div className="grid flex-1 gap-2">
            <label htmlFor="role-name">Display name</label>
            <Input
              id="role-name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            disabled={renameMutation.isPending || nameDraft.trim() === role.name}
            onClick={() => renameMutation.mutate(nameDraft.trim())}
          >
            Save name
          </Button>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Permissions</h2>
            <p className="text-sm text-muted-foreground">
              Assign permissions from the catalog. New permissions must be added in code.
            </p>
          </div>
          {canEditPermissions ? (
            <Button
              disabled={!hasPermissionChanges || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Save permissions
            </Button>
          ) : null}
        </div>

        <PermissionEditor
          catalog={catalog}
          selected={selected}
          disabled={!canEditPermissions}
          onToggle={(permission, checked) => {
            setSelected((current) => {
              const next = new Set(current);
              if (checked) {
                next.add(permission);
              } else {
                next.delete(permission);
              }
              return next;
            });
          }}
        />
      </div>
    </div>
  );
}
