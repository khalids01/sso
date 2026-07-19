import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { env } from "@env/public";

export type ApplicationAuthPolicy = {
  signInMethods: Array<"magic_link" | "password">;
  signUpMethods: Array<"magic_link">;
  registrationMode: "closed" | "invite_only" | "open";
};

function isApplicationAuthPolicy(metadata: Record<string, unknown>) {
  return (
    Array.isArray(metadata.sign_in_methods) &&
    metadata.sign_in_methods.every(
      (method) => method === "magic_link" || method === "password",
    ) &&
    Array.isArray(metadata.sign_up_methods) &&
    metadata.sign_up_methods.every((method) => method === "magic_link") &&
    (metadata.registration_mode === "closed" ||
      metadata.registration_mode === "invite_only" ||
      metadata.registration_mode === "open")
  );
}

export function ApplicationAuthShell({
  children,
}: {
  children: (applicationName: string, policy: ApplicationAuthPolicy) => ReactNode;
}) {
  const [application, setApplication] = useState<{
    name: string;
    policy: ApplicationAuthPolicy;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const oauthQuery = window.location.search.slice(1);
    const clientId = new URLSearchParams(oauthQuery).get("client_id");
    if (!oauthQuery || !clientId) {
      setUnavailable(true);
      return;
    }

    void Promise.all([
      authClient.oauth2.publicClientPrelogin({
        client_id: clientId,
        oauth_query: oauthQuery,
      }),
      fetch(
        `${env.VITE_SERVER_URL}/api/oauth/client-metadata?client_id=${encodeURIComponent(clientId)}`,
      ).then(async (response) => (response.ok ? response.json() : null)),
    ])
      .then(([{ data, error }, metadata]) => {
        if (error || !data) {
          setUnavailable(true);
          return;
        }
        if (
          !metadata ||
          metadata.client_id !== clientId ||
          typeof metadata !== "object" ||
          !isApplicationAuthPolicy(metadata)
        ) {
          setUnavailable(true);
          return;
        }
        setApplication({
          name: data.client_name || "application",
          policy: {
            signInMethods: metadata.sign_in_methods,
            signUpMethods: metadata.sign_up_methods,
            registrationMode: metadata.registration_mode,
          },
        });
      })
      .catch(() => setUnavailable(true));
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <p className="text-sm font-medium text-muted-foreground">Secured by SSO</p>
        {unavailable ? (
          <div className="mt-10 text-center">
            <h1 className="text-2xl font-semibold">Application unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This sign-in request is invalid or has expired.
            </p>
          </div>
        ) : application ? (
          children(application.name, application.policy)
        ) : (
          <LoaderCircle className="mt-12 size-8 animate-spin text-muted-foreground" />
        )}
      </section>
    </main>
  );
}
