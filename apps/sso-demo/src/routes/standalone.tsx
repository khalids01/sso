import { createFileRoute } from "@tanstack/react-router";
import { StandaloneLayout } from "@/features/standalone";
import { getSsoBootstrap } from "@/lib/sso-session";

export const Route = createFileRoute("/standalone")({
  loader: async () => ({ bootstrap: await getSsoBootstrap() }),
  component: StandaloneRouteLayout,
});

function StandaloneRouteLayout() {
  const { bootstrap } = Route.useLoaderData();
  return <StandaloneLayout bootstrap={bootstrap} />;
}
