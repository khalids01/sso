import { Home } from "@/features/landing/home";
import { env } from "@env/client";
import { createFileRoute } from "@tanstack/react-router";
import { getOwnerSetupStatus } from "@/features/admin/owner/api";

export const Route = createFileRoute("/_public/")({
  beforeLoad: async () => {
    if (!env.VITE_OWNER_SETUP_CHECK) {
      return;
    }
    // Check setup-status so the UI can conditionally render/setup links
    // but do NOT perform any automatic redirection. The user can still
    // navigate to /setup manually if OWNER_SETUP_CHECK is enabled and
    // no owner exists.
    try {
      await getOwnerSetupStatus();
    } catch {
      return;
    }

    // Intentionally do not redirect here. Let the page render and the
    // UI decide whether to show setup entry points.
    return;
  },
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <>
      <Home />
    </>
  );
}
