import { createFileRoute, redirect } from "@tanstack/react-router";
import { Permissions } from "@rbac";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { RolesListPage } from "@/features/admin/roles/roles-list-page";

export const Route = createFileRoute("/admin/roles")({
  beforeLoad: async ({ context }) => {
    if (
      !sessionHasPermission(
        context.session?.permissions ?? [],
        Permissions.AdminRolesList,
      )
    ) {
      throw redirect({ to: "/admin/overview" });
    }
  },
  component: RolesListPage,
});
