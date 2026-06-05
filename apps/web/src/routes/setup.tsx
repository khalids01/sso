import { createFileRoute, redirect } from "@tanstack/react-router";
import { OwnerSetup } from "@/features/admin/owner/owner-setup";
import { env } from "@env/client";
import { getOwnerSetupStatus } from "@/features/admin/owner/api";

export const Route = createFileRoute("/setup")({
  beforeLoad: async () => {
    if (!env.VITE_OWNER_SETUP_CHECK) {
      throw redirect({ to: "/" });
    }

    const data = await getOwnerSetupStatus().catch(() => null);
    // If owner already exists, don't allow access to setup page
    if (!data || data?.hasOwner) {
      throw redirect({ to: "/" });
    }
  },
  component: SetupPage,
});

function SetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <OwnerSetup />
    </div>
  );
}
