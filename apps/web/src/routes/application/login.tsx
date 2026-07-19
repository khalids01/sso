import { createFileRoute, redirect } from "@tanstack/react-router";

import { ApplicationAuthShell } from "@/features/auth/application-auth-shell";
import SignInForm from "@/features/auth/sign-in-form";
import { getRootSession } from "@/features/user/lib/get-root-session";

export const Route = createFileRoute("/application/login")({
  beforeLoad: async ({ context, location }) => {
    const session = context.session ?? (await getRootSession());
    if (session) {
      throw redirect({ href: `/authorize${location.searchStr}` });
    }
  },
  component: ApplicationLogin,
});

function ApplicationLogin() {
  return (
    <ApplicationAuthShell>
      {(applicationName, policy) => (
        <SignInForm applicationName={applicationName} applicationPolicy={policy} />
      )}
    </ApplicationAuthShell>
  );
}
