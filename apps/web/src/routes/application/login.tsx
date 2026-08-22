import { createFileRoute, redirect } from "@tanstack/react-router";

import { ApplicationAuthShell } from "@/features/auth/application-auth-shell";
import SignInForm from "@/features/auth/sign-in-form";
import { requiresFreshAuthentication } from "@/features/auth/auth-callback";
import { getApplicationAuthBootstrap } from "@/features/auth/application-auth-bootstrap";

export const Route = createFileRoute("/application/login")({
  beforeLoad: async ({ location }) => {
    const oauthQuery = location.searchStr.replace(/^\?/, "");
    const clientId = new URLSearchParams(oauthQuery).get("client_id");
    if (!clientId) throw redirect({ to: "/login" });
    const application = await getApplicationAuthBootstrap({
      data: { clientId, oauthQuery },
    });
    if (application.isAuthenticated && !requiresFreshAuthentication(location.searchStr)) {
      throw redirect({ href: `/authorize${location.searchStr}` });
    }
    return { application };
  },
  component: ApplicationLogin,
});

function ApplicationLogin() {
  const { application } = Route.useRouteContext();
  return (
    <ApplicationAuthShell application={application}>
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
