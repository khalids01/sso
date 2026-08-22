import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { client } from "@/lib/client";
import { queryKeys } from "@/constants/query-keys";
import { useHydrated } from "@/hooks/use-hydrated";
import { getApplicationAuthPath } from "./auth-callback";

export type ApplicationAuthPolicy = {
  signInMethods: Array<
    "magic_link" | "password" | "google" | "facebook" | "linkedin" | "github"
  >;
  signUpMethods: Array<
    "magic_link" | "password" | "google" | "facebook" | "linkedin" | "github"
  >;
  registrationMode: "closed" | "invite_only" | "open";
  passwordEmailVerificationRequired: boolean;
};

type AuthRequest = { clientId: string; oauthQuery: string };

function getAuthRequest(): AuthRequest | null {
  if (typeof window === "undefined") return null;

  const oauthQuery = getApplicationAuthPath("", window.location.search).slice(1);
  const clientId = new URLSearchParams(oauthQuery).get("client_id");
  return oauthQuery && clientId ? { clientId, oauthQuery } : null;
}

export function ApplicationAuthShell({
  children,
}: {
  children: (
    applicationName: string,
    policy: ApplicationAuthPolicy,
    applicationLogoUrl: string | null,
  ) => ReactNode;
}) {
  const hydrated = useHydrated();
  const authRequest = hydrated ? getAuthRequest() : null;
  const applicationQuery = useQuery({
    queryKey: queryKeys.oauth.prelogin(authRequest?.oauthQuery ?? ""),
    enabled: Boolean(authRequest),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!authRequest) throw new Error("Missing OAuth request");

      const response = await client.auth.application.bootstrap.post({
        clientId: authRequest.clientId,
        oauthQuery: authRequest.oauthQuery,
      });
      if (response.error || !response.data || "error" in response.data) {
        throw new Error("Invalid OAuth request");
      }
      return response.data;
    },
  });

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        {!hydrated ? (
          <ApplicationAuthLoading />
        ) : !authRequest || applicationQuery.isError ? (
          <div className="mt-10 text-center">
            <h1 className="text-2xl font-semibold">Application unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This sign-in request is invalid or has expired.
            </p>
          </div>
        ) : applicationQuery.data ? (
          children(
            applicationQuery.data.name,
            applicationQuery.data.policy,
            applicationQuery.data.logoUrl,
          )
        ) : (
          <ApplicationAuthLoading />
        )}
      </section>
    </main>
  );
}

function ApplicationAuthLoading() {
  return (
    <div className="mt-10 w-full rounded-xl border bg-card p-6 shadow-sm" aria-busy="true" aria-label="Loading secure sign-in">
      <div className="mx-auto size-14 animate-pulse rounded-2xl bg-muted" />
      <div className="mx-auto mt-5 h-7 w-52 animate-pulse rounded-md bg-muted" />
      <div className="mx-auto mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-8 space-y-3">
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
      <span className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Loading secure sign-in options…
      </span>
    </div>
  );
}
