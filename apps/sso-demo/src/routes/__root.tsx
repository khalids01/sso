import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DemoSsoProvider } from "@/components/auth/sso-provider";
import { getDemoSession } from "@/lib/session";

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
  loader: async () => ({ session: await getDemoSession() }),
  component: RootDocument,
});

function RootDocument() {
  const { session } = Route.useLoaderData();
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <DemoSsoProvider initialSession={session}>
          <AppShell />
        </DemoSsoProvider>
        <Scripts />
      </body>
    </html>
  );
}
