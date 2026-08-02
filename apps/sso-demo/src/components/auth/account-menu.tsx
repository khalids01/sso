import { SsoUserMenu, useSso } from "@skycanvasstudio/sso/react";
import { LayoutDashboard } from "lucide-react";
import type { DemoUser } from "@/lib/sso-types";

const dashboardItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: <LayoutDashboard />,
} as const;

export function AccountMenu() {
  const { session } = useSso<DemoUser>();

  if (!session) {
    return (
      <span className="rounded-full border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        Public client
      </span>
    );
  }

  return (
    <SsoUserMenu
      user={session.user}
      items={[dashboardItem]}
      logoutReturnTo="/"
    />
  );
}
