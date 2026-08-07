import { createFileRoute } from "@tanstack/react-router";
import { BetterAuthLayout } from "@/features/better-auth";
import { getBetterAuthBootstrap } from "@/lib/better-auth-session";

export const Route = createFileRoute("/better-auth")({
  loader: async () => ({ bootstrap: await getBetterAuthBootstrap() }),
  component: BetterAuthRouteLayout,
});

function BetterAuthRouteLayout() {
  const { bootstrap } = Route.useLoaderData();
  return <BetterAuthLayout bootstrap={bootstrap} />;
}
