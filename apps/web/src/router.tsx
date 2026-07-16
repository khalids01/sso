import {
  createRouter as createTanStackRouter,
  defaultParseSearch,
} from "@tanstack/react-router";

import Loader from "./components/loader";
import "./index.css";
import { routeTree } from "./routeTree.gen";
import type { RouterAppContext } from "./routes/__root";
import { stringifyRepeatedSearchParams } from "./lib/search-params";

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    context: {} satisfies RouterAppContext,
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    parseSearch: defaultParseSearch,
    stringifySearch: stringifyRepeatedSearchParams,
    Wrap: ({ children }) => <>{children}</>,
  });
  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
