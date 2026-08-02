import { createSsoClient } from "@skycanvasstudio/sso/client";
import { SsoProvider, SsoUserMenu, type SsoProviderProps, useSso } from "@skycanvasstudio/sso/react";
import { LayoutDashboard } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DemoUser } from "@/lib/auth.server";

export function DemoSsoProvider({
  initialSession,
  children,
}: Pick<SsoProviderProps<DemoUser>, "initialSession"> & { children: ReactNode }) {
  const [client] = useState(() => createSsoClient<DemoUser>());
  return <SsoProvider client={client} initialSession={initialSession}>{children}</SsoProvider>;
}

export function DemoAccountMenu() {
  const { session, logout } = useSso<DemoUser>();
  if (!session) {
    return <span className="rounded-full border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground">Public client</span>;
  }

  return (
    <SsoUserMenu
      user={session.user}
      showSwitchAccount
      items={[{ label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard /> }]}
      onLogout={async () => {
        await logout();
        window.location.assign("/");
      }}
    />
  );
}
