import { createFileRoute } from "@tanstack/react-router";
import { IntegrationGuide } from "@/features/docs/integration-guide";

export const Route = createFileRoute("/_public/docs")({
  head: () => ({
    meta: [
      { title: "Integration Guide · SkyCanvas SSO" },
      {
        name: "description",
        content: "Add SkyCanvas SSO with Better Auth, another auth library, no auth library, or a non-JavaScript backend.",
      },
    ],
  }),
  component: IntegrationGuide,
});
