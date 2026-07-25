import { Home } from "@/features/landing/home";
import { createFileRoute } from "@tanstack/react-router";
import { BRANDING } from "@/constants/branding";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      {
        title: BRANDING.appName,
      },
      {
        name: "description",
        content: BRANDING.description,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: BRANDING.urls.homepage,
      },
    ],
  }),
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <>
      <Home />
    </>
  );
}
