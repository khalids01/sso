import { createFileRoute, redirect } from "@tanstack/react-router";

import { ApplicationAuthShell } from "@/features/auth/application-auth-shell";
import SignUpForm from "@/features/auth/sign-up-form";
import { getRootSession } from "@/features/user/lib/get-root-session";

export const Route = createFileRoute("/application/signup")({
  beforeLoad: async ({ context, location }) => {
    const session = context.session ?? (await getRootSession());
    if (session) {
      throw redirect({ href: `/authorize${location.searchStr}` });
    }
  },
  component: ApplicationSignup,
});

function ApplicationSignup() {
  return (
    <ApplicationAuthShell>
      {(applicationName) => <SignUpForm applicationName={applicationName} />}
    </ApplicationAuthShell>
  );
}
