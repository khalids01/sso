import { createFileRoute, redirect } from "@tanstack/react-router";

import { ApplicationAuthShell } from "@/features/auth/application-auth-shell";
import SignInForm from "@/features/auth/sign-in-form";
import { getRootSession } from "@/features/user/lib/get-root-session";
import { requiresFreshAuthentication } from "@/features/auth/auth-callback";

export const Route = createFileRoute("/application/login")({
  beforeLoad: async ({ context, location }) => {
    const session = context.session ?? (await getRootSession());
    if (session && !requiresFreshAuthentication(location.searchStr)) {
      throw redirect({ href: `/authorize${location.searchStr}` });
    }
  },
  component: ApplicationLogin,
});

function ApplicationLogin() {
  return (
    <ApplicationAuthShell>
      {(applicationName, policy, applicationLogoUrl) => (
        <SignInForm
          applicationName={applicationName}
          applicationLogoUrl={applicationLogoUrl}
          applicationPolicy={policy}
        />
      )}
    </ApplicationAuthShell>
  );
}
