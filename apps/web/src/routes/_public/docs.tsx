import { createFileRoute } from "@tanstack/react-router";
import { IntegrationGuide } from "@/features/docs/integration-guide";

export const Route = createFileRoute("/_public/docs")({
  head: () => ({
    meta: [
      { title: "Integration Guide · SkyCanvas SSO" },
      {
        name: "description",
        content: "Integrate SkyCanvas SSO with React, Node, Better Auth, TanStack React, and Elysia.",
      },
    ],
  }),
  component: IntegrationGuide,
});
