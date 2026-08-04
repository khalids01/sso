import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { SsoProvider } from "@skycanvasstudio/sso/react";
import { AppShell } from "@/components/app-shell";
import { getSsoBootstrap } from "@/lib/sso-session";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SSO Demo" },
      {
        name: "description",
        content: "Reference TanStack application for the SSO authorization-code flow",
      },
    ],
  }),
  loader: async () => ({ bootstrap: await getSsoBootstrap() }),
  component: RootDocument,
});

function RootDocument() {
  const { bootstrap } = Route.useLoaderData();
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <SsoProvider bootstrap={bootstrap}>
          <AppShell />
        </SsoProvider>
        <Scripts />
      </body>
    </html>
  );
}
