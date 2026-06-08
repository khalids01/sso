import { Route as RootRoute } from "@/routes/__root";

export function useSession() {
  const { session } = RootRoute.useLoaderData();
  return { session };
}
