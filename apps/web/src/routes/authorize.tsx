import { createFileRoute, useLocation } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { BRANDING } from "@/constants/branding";
import { getProviderRedirect } from "@/features/auth/provider-redirect";

const activeAuthorizations = new Set<string>();
const fallbackAuthorizationAttempts = new Map<string, number>();
const AUTHORIZATION_ATTEMPT_TTL_MS = 60_000;

function authorizationAttemptKey(oauthQuery: string) {
  const params = new URLSearchParams(oauthQuery);
  return `skycanvas:authorization-attempt:${params.get("client_id")}:${params.get("state")}`;
}

function claimAuthorizationAttempt(oauthQuery: string) {
  const key = authorizationAttemptKey(oauthQuery);
  let previous = fallbackAuthorizationAttempts.get(key) ?? 0;
  try {
    previous = Number(window.sessionStorage.getItem(key)) || previous;
  } catch {
    // Some privacy modes deny storage access; the in-memory guard still works.
  }
  if (Number.isFinite(previous) && Date.now() - previous < AUTHORIZATION_ATTEMPT_TTL_MS) {
    return null;
  }
  fallbackAuthorizationAttempts.set(key, Date.now());
  try {
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Keep the in-memory attempt marker.
  }
  return key;
}

function clearAuthorizationAttempt(key: string) {
  fallbackAuthorizationAttempts.delete(key);
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // The in-memory marker was already cleared.
  }
}

export const Route = createFileRoute("/authorize")({
  component: AuthorizePage,
});

function AuthorizePage() {
  const search = useLocation({ select: (location) => location.searchStr });
  const oauthQuery = search.replace(/^\?/, "");
  const oauthParams = new URLSearchParams(oauthQuery);
  const isConsentStep = oauthParams.has("ba_pl");
  const requiresFreshLoginCompletion = oauthParams.get("prompt") === "login";
  const started = useRef(false);
  const [clientName, setClientName] = useState("application");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const followRedirect = useCallback((redirect: string) => {
    const target = new URL(redirect, window.location.origin);
    if (target.origin !== window.location.origin || target.pathname !== "/authorize") {
      clearAuthorizationAttempt(authorizationAttemptKey(oauthQuery));
    }
    window.location.assign(target.toString());
  }, [oauthQuery]);

  const submitConsent = useCallback(async (accept: boolean) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await authClient.oauth2.consent({ accept, oauth_query: oauthQuery });
      const redirect = getProviderRedirect(result.data);
      if (redirect) {
        followRedirect(redirect);
        return;
      }
      throw new Error("Authorization did not return a redirect");
    } catch {
      setErrorMessage(`${BRANDING.appName} could not complete this authorization request.`);
      setIsSubmitting(false);
    }
  }, [followRedirect, oauthQuery]);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const continueAuthorization = async () => {
      const clientId = new URLSearchParams(oauthQuery).get("client_id");

      if (!oauthQuery || !clientId) {
        setErrorMessage("This authorization request is invalid or incomplete.");
        return;
      }
      if (activeAuthorizations.has(oauthQuery)) return;
      activeAuthorizations.add(oauthQuery);
      let attemptKey: string | null = null;

      try {
        const publicClient = await authClient.oauth2.publicClient({
          query: { client_id: clientId },
        });

        if (publicClient.error || !publicClient.data) {
          activeAuthorizations.delete(oauthQuery);
          setErrorMessage("This application is unavailable.");
          return;
        }

        setClientName(publicClient.data.client_name || "application");
        if (isConsentStep) {
          activeAuthorizations.delete(oauthQuery);
          return;
        }

        attemptKey = claimAuthorizationAttempt(oauthQuery);
        if (!attemptKey) {
          activeAuthorizations.delete(oauthQuery);
          setErrorMessage("A repeated authorization redirect was stopped. Close this window and start sign-in again.");
          return;
        }

        const continuation = requiresFreshLoginCompletion
          ? await authClient.oauth2.consent({ accept: true, oauth_query: oauthQuery })
          : await authClient.oauth2.continue({
              postLogin: true,
              oauth_query: oauthQuery,
            });

        const continuationRedirect = getProviderRedirect(continuation.data);
        if (continuationRedirect) {
          followRedirect(continuationRedirect);
          return;
        }

        clearAuthorizationAttempt(attemptKey);
        activeAuthorizations.delete(oauthQuery);
        setErrorMessage(
          `${BRANDING.appName} could not complete this authorization request.`,
        );
      } catch {
        if (attemptKey) clearAuthorizationAttempt(attemptKey);
        activeAuthorizations.delete(oauthQuery);
        setErrorMessage(
          `${BRANDING.appName} could not complete this authorization request.`,
        );
      }
    };

    void continueAuthorization();
  }, [followRedirect, isConsentStep, oauthQuery, requiresFreshLoginCompletion]);

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
        {errorMessage ? (
          <>
            <h1 className="text-2xl font-semibold">Authorization failed</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage}
            </p>
          </>
        ) : isConsentStep ? (
          <>
            <h1 className="text-2xl font-semibold">Continue to {clientName}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Confirm that you want to share your basic profile and email with this application.
            </p>
            <div className="mt-7 flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => void submitConsent(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => void submitConsent(true)}
              >
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
                Continue
              </Button>
            </div>
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
