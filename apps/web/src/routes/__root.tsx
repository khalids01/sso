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
import type { ClientSessionResult } from "@sso/auth/client";
import { BRANDING } from "@/constants/branding";


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
        title: BRANDING.appName,
      },
      {
        name: "description",
        content: BRANDING.description,
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TanstackQueryProvider>
            <Outlet />
          </TanstackQueryProvider>
          <Toaster richColors position="top-center"/>
          {/* {isDevelopment && <TanStackRouterDevtools position="bottom-left" />} */}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
