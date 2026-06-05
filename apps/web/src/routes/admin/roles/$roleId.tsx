import { createFileRoute, redirect } from "@tanstack/react-router";
import { Permissions } from "@rbac";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { RoleDetailPage } from "@/features/admin/roles/role-detail-page";

export const Route = createFileRoute("/admin/roles/$roleId")({
  beforeLoad: async ({ context }) => {
    if (
      !sessionHasPermission(
        context.session?.permissions ?? [],
        Permissions.AdminRolesRead,
      )
    ) {
      throw redirect({ to: "/admin/overview" });
    }
  },
  component: RoleDetailRoute,
});

function RoleDetailRoute() {
  const { roleId } = Route.useParams();
  return <RoleDetailPage roleId={roleId} />;
}
