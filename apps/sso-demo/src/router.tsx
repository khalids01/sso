import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";

export const getRouter = () => createTanStackRouter({
  routeTree,
  scrollRestoration: true,
  defaultNotFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted-foreground">The page you requested does not exist.</p>
      <a className="mt-8 inline-flex text-sm font-semibold text-primary hover:underline" href="/">
        Return home
      </a>
    </main>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
