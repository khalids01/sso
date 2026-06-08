import { createMiddleware } from "@tanstack/react-start";

import { getRootSession } from "@/features/user/lib/get-root-session";
import { Roles } from "@rbac";
import { redirect } from "@tanstack/react-router";

function canAccessOwner(session: {
  permissions: readonly string[];
  primaryRoleSlug: string;
}) {
  return (
    session.primaryRoleSlug === Roles.PlatformOwner
  );
}


export const ownerMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getRootSession();

  if (session && !canAccessOwner(session)) {
    throw redirect({ to: "/admin/overview" });
  }

  return next({
    context: { session },
  });
});

