import { Link, useLocation } from "@tanstack/react-router";
import { env } from "@env/public";

import { Button } from "@/components/ui/button";

import { AuthMethodDivider } from "./auth-method-divider";
import { MagicLinkSignInForm } from "./magic-link-sign-in-form";
import { PasswordSignInForm } from "./password-sign-in-form";
import { getApplicationAuthPath } from "./auth-callback";

export default function SignInForm({
  applicationName,
}: {
  applicationName?: string;
}) {
  const search = useLocation({ select: (location) => location.searchStr });
  const isApplicationLogin = Boolean(applicationName);
  const signupHref = isApplicationLogin
    ? getApplicationAuthPath("/application/signup", search)
    : "/signup";

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
        {env.VITE_ENABLE_PASSWORD_AUTH ? (
          <>
            <PasswordSignInForm />
            <AuthMethodDivider label="or continue with" />
          </>
        ) : null}
        <MagicLinkSignInForm />
      </div>

      <div className="mt-4 text-center">
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
      </div>
    </div>
  );
}
