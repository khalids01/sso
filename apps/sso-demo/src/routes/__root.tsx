import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { DemoAccountMenu, DemoSsoProvider } from "@/components/sso";
import { getDemoSession } from "@/lib/session";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SSO Demo" },
      { name: "description", content: "Reference TanStack application for the SSO authorization-code flow" },
    ],
  }),
  loader: async () => ({ session: await getDemoSession() }),
  component: RootDocument,
});

function RootDocument() {
  const { session } = Route.useLoaderData();
  return (
    <html lang="en" className="dark" data-theme="dark">
      <head><HeadContent /></head>
      <body>
        <DemoSsoProvider initialSession={session}>
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 md:px-8">
            <Link to="/" className="flex items-center gap-3" aria-label="SSO Demo home">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <ShieldCheck className="size-5" />
              </span>
              <span><strong className="block text-sm tracking-tight">SSO Demo</strong><span className="block text-xs text-muted-foreground">Powered by @skycanvasstudio/sso</span></span>
            </Link>
            <DemoAccountMenu />
          </header>
          <Outlet />
          <footer className="mx-auto mt-16 max-w-6xl border-t px-5 py-8 text-xs text-muted-foreground md:px-8">
            Authentication, verified sessions, profile UI, account switching, and logout come from the SSO library.
          </footer>
        </DemoSsoProvider>
        <Scripts />
      </body>
    </html>
  );
}
