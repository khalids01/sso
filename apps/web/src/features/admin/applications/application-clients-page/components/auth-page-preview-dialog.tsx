import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignInForm from "@/features/auth/sign-in-form";
import SignUpForm from "@/features/auth/sign-up-form";
import type { ApplicationAuthPolicy } from "@/features/auth/application-auth-shell";
import type { AdminApplication, ApplicationClient } from "../../types";

export function AuthPagePreviewDialog(props: {
  application: AdminApplication;
  client: ApplicationClient | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState<"login" | "signup">("login");
  const policy: ApplicationAuthPolicy = {
    signInMethods: props.application.signInMethods,
    signUpMethods: props.application.signUpMethods,
    registrationMode: props.application.registrationMode,
    passwordEmailVerificationRequired:
      props.application.passwordEmailVerificationRequired,
  };

  return (
    <Dialog
      open={Boolean(props.client)}
      onOpenChange={(open) => {
        if (open) setPage("login");
        props.onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Authentication page preview</DialogTitle>
          <DialogDescription>
            {props.client?.name} uses the current authentication settings from{" "}
            {props.application.name}. Preview fields and actions are disabled.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2">
          <Button type="button" size="sm" variant={page === "login" ? "default" : "outline"} onClick={() => setPage("login")}>
            Login
          </Button>
          <Button type="button" size="sm" variant={page === "signup" ? "default" : "outline"} onClick={() => setPage("signup")}>
            Signup
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="max-h-[68vh] overflow-y-auto">
            <main className="min-h-[620px] bg-background">
              <section className="mx-auto flex max-w-md flex-col items-center px-6 py-12">
                <div
                  inert
                  aria-label={`${page} page non-interactive preview`}
                  className="pointer-events-none w-full select-none"
                >
                  {page === "login" ? (
                    <SignInForm
                      applicationName={props.application.name}
                      applicationLogoUrl={props.application.logoUrl}
                      applicationPolicy={policy}
                    />
                  ) : (
                    <SignUpForm
                      applicationName={props.application.name}
                      applicationLogoUrl={props.application.logoUrl}
                      applicationPolicy={policy}
                    />
                  )}
                </div>
              </section>
            </main>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
