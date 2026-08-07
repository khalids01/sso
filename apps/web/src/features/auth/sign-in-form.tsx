import { Link, useLocation } from "@tanstack/react-router";
import { env } from "@sso/env/public";

import { Button } from "@/components/ui/button";

import { AuthMethodDivider } from "./auth-method-divider";
import { MagicLinkSignInForm } from "./magic-link-sign-in-form";
import { PasswordSignInForm } from "./password-sign-in-form";
import { getApplicationAuthPath } from "./auth-callback";
import type { ApplicationAuthPolicy } from "./application-auth-shell";
import {
  SocialAuthButtons,
  type SocialAuthMethod,
} from "./social-auth-buttons";
import { BRANDING } from "@/constants/branding";

export default function SignInForm({
  applicationName,
  applicationLogoUrl,
  applicationPolicy,
}: {
  applicationName?: string;
  applicationLogoUrl?: string | null;
  applicationPolicy?: ApplicationAuthPolicy;
}) {
  const search = useLocation({ select: (location) => location.searchStr });
  const isApplicationLogin = Boolean(applicationName);
  const signupHref = isApplicationLogin
    ? getApplicationAuthPath("/application/signup", search)
    : "/signup";
  const showPassword = env.VITE_ENABLE_PASSWORD_AUTH &&
    (!applicationPolicy || applicationPolicy.signInMethods.includes("password"));
  const showMagicLink = !applicationPolicy ||
    applicationPolicy.signInMethods.includes("magic_link");
  const socialMethods = (applicationPolicy?.signInMethods ?? []).filter(
    (method): method is SocialAuthMethod =>
      method === "google" ||
      method === "facebook" ||
      method === "linkedin" ||
      method === "github",
  );
  const requestedProvider = new URLSearchParams(search).get("provider");
  const autoStartProvider = socialMethods.find((method) => method === requestedProvider);
  const showSignup = !applicationPolicy || applicationPolicy.signUpMethods.length > 0;

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      {isApplicationLogin ? (
        <div className="relative mx-auto mb-5 flex size-16 items-center justify-center overflow-hidden rounded-2xl border bg-primary/10 text-xl font-bold text-primary shadow-sm">
          {applicationName?.trim().charAt(0).toUpperCase() || "A"}
          {applicationLogoUrl ? (
            <img
              src={applicationLogoUrl}
              alt={`${applicationName} logo`}
              className="absolute inset-0 size-full bg-background object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>
      ) : null}
      <h1 className="mb-2 text-center text-3xl font-bold">
        {isApplicationLogin ? `Continue to ${applicationName}` : "Welcome Back"}
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {isApplicationLogin
          ? `Sign in to your account.`
          : `Sign in to ${BRANDING.appName}.`}
      </p>

      <div className="space-y-6">
        {socialMethods.length > 0 ? (
          <>
            <SocialAuthButtons methods={socialMethods} autoStartProvider={autoStartProvider} />
            {(showPassword || showMagicLink) ? (
              <AuthMethodDivider label="or continue with email" />
            ) : null}
          </>
        ) : null}
        {showPassword ? (
          <>
            <PasswordSignInForm />
            {showMagicLink ? <AuthMethodDivider label="or continue with" /> : null}
          </>
        ) : null}
        {showMagicLink ? <MagicLinkSignInForm /> : null}
      </div>

      {showSignup ? <div className="mt-4 text-center">
        <Button
          variant="link"
          render={
            isApplicationLogin ? (
              <a href={signupHref} />
            ) : (
              <Link to="/signup" />
            )
          }
        >
          Need an account? Sign Up
        </Button>
      </div> : null}
    </div>
  );
}
