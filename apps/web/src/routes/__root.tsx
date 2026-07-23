import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TanstackQueryProvider } from "@/providers/tanstack-query";
import { ThemeProvider } from "@/providers/theme-provider";
import { getRootSession } from "@/features/user/lib/get-root-session";
import { VisitorTracker } from "@/features/visitors/visitor-tracker";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ClientSessionResult } from "@auth/client";


export interface RouterAppContext {
  session?: ClientSessionResult;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "SSO",
      },
    ],
    links: [
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
  }),
  loader: async () => {
    const session = await getRootSession();
    return { session: session ?? null };
  },
  staleTime: Infinity,
  gcTime: Infinity,
  shouldReload: false,

  component: RootDocument,
});

function RootDocument() {
  const hydrated = useHydrated();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body inert={hydrated ? undefined : true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TanstackQueryProvider>
            <Outlet />
          </TanstackQueryProvider>
          <VisitorTracker />
          <Toaster richColors position="top-center"/>
          {/* {isDevelopment && <TanStackRouterDevtools position="bottom-left" />} */}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
