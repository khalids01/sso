import { Link } from "@tanstack/react-router";
import { env } from "@env/public";

import { Button } from "@/components/ui/button";

import { AuthMethodDivider } from "./auth-method-divider";
import { MagicLinkSignInForm } from "./magic-link-sign-in-form";
import { PasswordSignInForm } from "./password-sign-in-form";

export default function SignInForm() {
  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Welcome Back</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Sign in to continue to SSO.
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
        <Button variant="link" render={<Link to="/signup" />}>
          Need an account? Sign Up
        </Button>
      </div>
    </div>
  );
}
