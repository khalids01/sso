import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/client";
import { BRANDING } from "@/constants/branding";
import { queryKeys } from "@/constants/query-keys";

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

  const oauthQuery = window.location.search.slice(1);
  const clientId = new URLSearchParams(oauthQuery).get("client_id");
  return oauthQuery && clientId ? { clientId, oauthQuery } : null;
}

export function ApplicationAuthShell({
  children,
}: {
  children: (applicationName: string, policy: ApplicationAuthPolicy) => ReactNode;
}) {
  const authRequest = getAuthRequest();
  const applicationQuery = useQuery({
    queryKey: queryKeys.oauth.prelogin(authRequest?.oauthQuery ?? ""),
    enabled: Boolean(authRequest),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!authRequest) throw new Error("Missing OAuth request");

      const [prelogin, metadataResponse] = await Promise.all([
        authClient.oauth2.publicClientPrelogin({
          client_id: authRequest.clientId,
          oauth_query: authRequest.oauthQuery,
        }),
        client.api.oauth["client-metadata"].get({
          query: { client_id: authRequest.clientId },
        }),
      ]);

      if (prelogin.error || !prelogin.data || metadataResponse.error || !metadataResponse.data) {
        throw new Error("Invalid OAuth request");
      }
      if (metadataResponse.data.client_id !== authRequest.clientId) {
        throw new Error("Client metadata does not match OAuth request");
      }

      return {
        name: prelogin.data.client_name || "application",
        policy: {
          signInMethods: metadataResponse.data.sign_in_methods,
          signUpMethods: metadataResponse.data.sign_up_methods,
          registrationMode: metadataResponse.data.registration_mode,
          passwordEmailVerificationRequired:
            metadataResponse.data.password_email_verification_required,
        } satisfies ApplicationAuthPolicy,
      };
    },
  });

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <p className="text-sm font-medium text-muted-foreground">
          Secured by {BRANDING.appName}
        </p>
        {!authRequest || applicationQuery.isError ? (
          <div className="mt-10 text-center">
            <h1 className="text-2xl font-semibold">Application unavailable</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This sign-in request is invalid or has expired.
            </p>
          </div>
        ) : applicationQuery.data ? (
          children(applicationQuery.data.name, applicationQuery.data.policy)
        ) : (
          <LoaderCircle className="mt-12 size-8 animate-spin text-muted-foreground" />
        )}
      </section>
    </main>
  );
}
