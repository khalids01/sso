import { Outlet } from "@tanstack/react-router";
import { BetterAuthSsoProvider } from "@/lib/better-auth-client";
import type { getBetterAuthBootstrap } from "@/lib/better-auth-session";

type BetterAuthBootstrap = Awaited<ReturnType<typeof getBetterAuthBootstrap>>;

export function BetterAuthLayout({ bootstrap }: { bootstrap: BetterAuthBootstrap }) {
  return (
    <BetterAuthSsoProvider bootstrap={bootstrap}>
      <Outlet />
    </BetterAuthSsoProvider>
  );
}
