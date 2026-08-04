import { SsoUserMenu } from "@skycanvasstudio/sso/react";
import { LayoutDashboard } from "lucide-react";

const dashboardItem = {
  label: "Dashboard",
  href: "/dashboard",
  icon: <LayoutDashboard />,
} as const;

export function AccountMenu() {
  return (
    <SsoUserMenu
      items={[dashboardItem]}
      logoutReturnTo="/"
    />
  );
}
