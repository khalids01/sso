import { type ReactNode } from "react";

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

export function ApplicationAuthShell({
  children,
  application,
}: {
  application: {
    name: string;
    policy: ApplicationAuthPolicy;
    logoUrl: string | null;
  };
  children: (
    applicationName: string,
    policy: ApplicationAuthPolicy,
    applicationLogoUrl: string | null,
  ) => ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        {children(application.name, application.policy, application.logoUrl)}
      </section>
    </main>
  );
}
