import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import Logo from "@/components/core/logo";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/authorize")({
  component: AuthorizePage,
});

function getProviderRedirect(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const value = data as { redirect_uri?: unknown; uri?: unknown };
  if (typeof value.redirect_uri === "string") {
    return value.redirect_uri;
  }
  return typeof value.uri === "string" ? value.uri : null;
}

function AuthorizePage() {
  const started = useRef(false);
  const [clientName, setClientName] = useState("application");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const continueAuthorization = async () => {
      const oauthQuery = window.location.search.slice(1);
      const clientId = new URLSearchParams(oauthQuery).get("client_id");

      if (!oauthQuery || !clientId) {
        setErrorMessage("This authorization request is invalid or incomplete.");
        return;
      }

      const publicClient = await authClient.oauth2.publicClient({
        query: { client_id: clientId },
      });

      if (publicClient.error || !publicClient.data) {
        setErrorMessage("This application is unavailable.");
        return;
      }

      setClientName(publicClient.data.client_name || "application");

      const continuation = await authClient.oauth2.continue({
        postLogin: true,
        oauth_query: oauthQuery,
      });

      const continuationRedirect = getProviderRedirect(continuation.data);
      if (continuationRedirect) {
        window.location.assign(continuationRedirect);
        return;
      }

      if (continuation.error) {
        const denial = await authClient.oauth2.consent({
          accept: false,
          oauth_query: oauthQuery,
        });

        const denialRedirect = getProviderRedirect(denial.data);
        if (denialRedirect) {
          window.location.assign(denialRedirect);
          return;
        }
      }

      setErrorMessage("SSO could not complete this authorization request.");
    };

    void continueAuthorization();
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex max-w-6xl items-center py-3">
          <Logo />
        </div>
      </header>
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        {errorMessage ? (
          <>
            <h1 className="text-2xl font-semibold">Authorization failed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </>
        ) : (
          <>
            <LoaderCircle className="size-8 animate-spin text-muted-foreground" />
            <h1 className="mt-5 text-2xl font-semibold">
              Signing you in to {clientName}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Checking your application access and completing the secure sign-in.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
