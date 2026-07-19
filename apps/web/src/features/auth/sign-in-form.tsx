import { Link, useLocation } from "@tanstack/react-router";
import { env } from "@env/public";

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

export default function SignInForm({
  applicationName,
  applicationPolicy,
}: {
  applicationName?: string;
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
  const showSignup = !applicationPolicy || applicationPolicy.signUpMethods.length > 0;

  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">
        {isApplicationLogin ? `Continue to ${applicationName}` : "Welcome Back"}
      </h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {isApplicationLogin
          ? "Sign in with your SSO account."
          : "Sign in to continue to SSO."}
      </p>

      <div className="space-y-6">
        {socialMethods.length > 0 ? (
          <>
            <SocialAuthButtons methods={socialMethods} />
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
