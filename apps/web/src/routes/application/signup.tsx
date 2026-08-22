import { createFileRoute, redirect } from "@tanstack/react-router";

import { ApplicationAuthShell } from "@/features/auth/application-auth-shell";
import SignUpForm from "@/features/auth/sign-up-form";
import { getApplicationAuthBootstrap } from "@/features/auth/application-auth-bootstrap";

export const Route = createFileRoute("/application/signup")({
  beforeLoad: async ({ location }) => {
    const oauthQuery = location.searchStr.replace(/^\?/, "");
    const clientId = new URLSearchParams(oauthQuery).get("client_id");
    if (!clientId) throw redirect({ to: "/signup" });
    const application = await getApplicationAuthBootstrap({
      data: { clientId, oauthQuery },
    });
    if (application.isAuthenticated) {
      throw redirect({ href: `/authorize${location.searchStr}` });
    }
    return { application };
  },
  component: ApplicationSignup,
});

function ApplicationSignup() {
  const { application } = Route.useRouteContext();
  return (
    <ApplicationAuthShell application={application}>
      {(applicationName, policy, applicationLogoUrl) => (
        <SignUpForm
          applicationName={applicationName}
          applicationLogoUrl={applicationLogoUrl}
          applicationPolicy={policy}
        />
      )}
    </ApplicationAuthShell>
  );
}
