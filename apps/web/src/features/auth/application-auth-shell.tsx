import { useEffect, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function ApplicationAuthShell({
  children,
}: {
  children: (applicationName: string) => ReactNode;
}) {
  const [applicationName, setApplicationName] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const oauthQuery = window.location.search.slice(1);
    const clientId = new URLSearchParams(oauthQuery).get("client_id");
    if (!oauthQuery || !clientId) {
      setUnavailable(true);
      return;
    }

    void authClient.oauth2
      .publicClientPrelogin({ client_id: clientId, oauth_query: oauthQuery })
      .then(({ data, error }) => {
        if (error || !data) {
          setUnavailable(true);
          return;
        }
        setApplicationName(data.client_name || "application");
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
        ) : applicationName ? (
          children(applicationName)
        ) : (
          <LoaderCircle className="mt-12 size-8 animate-spin text-muted-foreground" />
        )}
      </section>
    </main>
  );
}
