import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { SkyCanvasProvider } from "@skycanvasstudio/sso/react";
import { AppShell } from "@/components/app-shell";
import { BetterAuthSsoProvider } from "@/lib/better-auth-client";
import { getBetterAuthBootstrap } from "@/lib/better-auth-session";

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
  loader: async () => ({ betterAuthBootstrap: await getBetterAuthBootstrap() }),
  component: RootDocument,
});

function RootDocument() {
  const { betterAuthBootstrap } = Route.useLoaderData();
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <SkyCanvasProvider>
          <BetterAuthSsoProvider bootstrap={betterAuthBootstrap}>
            <AppShell />
          </BetterAuthSsoProvider>
        </SkyCanvasProvider>
        <Scripts />
      </body>
    </html>
  );
}
