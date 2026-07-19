import { Link, useLocation } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { client } from "@/lib/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApplicationAuthPath, getAuthCallbackURL } from "./auth-callback";
import type { ApplicationAuthPolicy } from "./application-auth-shell";
import { AuthMethodDivider } from "./auth-method-divider";
import { PasswordSignUpForm } from "./password-sign-up-form";
import {
  SocialAuthButtons,
  type SocialAuthMethod,
} from "./social-auth-buttons";

export default function SignUpForm({
  applicationName,
  applicationPolicy,
}: {
  applicationName?: string;
  applicationPolicy?: ApplicationAuthPolicy;
}) {
  const search = useLocation({ select: (location) => location.searchStr });
  const isApplicationSignup = Boolean(applicationName);
  const loginHref = isApplicationSignup
    ? getApplicationAuthPath("/application/login", search)
    : "/login";
  const showMagicSignup =
    !applicationPolicy || applicationPolicy.signUpMethods.includes("magic_link");
  const showPasswordSignup =
    Boolean(applicationPolicy?.signUpMethods.includes("password"));
  const socialMethods = (applicationPolicy?.signUpMethods ?? []).filter(
    (method): method is SocialAuthMethod =>
      method === "google" ||
      method === "facebook" ||
      method === "linkedin" ||
      method === "github",
  );
  const signupAvailable =
    showMagicSignup || showPasswordSignup || socialMethods.length > 0;
  const magicLinkForm = useForm({
    defaultValues: {
      email: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      const { error } = await client.auth["magic-link"].signup.post({
        email: value.email,
        name: value.name,
        callbackURL: getAuthCallbackURL(),
      });

      if (error) {
        // @ts-ignore
        const message = error.value?.message || "Failed to send magic link";
        toast.error(message);
        return;
      }

      toast.success("Magic link sent! Check your email to confirm.");
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
      }),
    },
  });

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-3xl font-bold">Create Account</h1>
      {isApplicationSignup ? (
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Create an SSO account to continue to {applicationName}.
        </p>
      ) : null}
      {!signupAvailable ? (
        <div className="rounded-md border px-4 py-5 text-center text-sm text-muted-foreground">
          Registration is not available for this application.
        </div>
      ) : (
        <div className="space-y-5">
          {socialMethods.length > 0 ? (
            <>
              <SocialAuthButtons methods={socialMethods} requestSignUp />
              {showMagicSignup || showPasswordSignup ? (
                <AuthMethodDivider label="or sign up with email" />
              ) : null}
            </>
          ) : null}
          {showMagicSignup ? <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          magicLinkForm.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <magicLinkForm.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="magic-signup-name">Name</Label>
                <Input
                  id="magic-signup-name"
                  name={field.name}
                  placeholder="Your name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </magicLinkForm.Field>
        </div>

        <div>
          <magicLinkForm.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="magic-signup-email">Email</Label>
                <Input
                  id="magic-signup-email"
                  name={field.name}
                  type="email"
                  placeholder="you@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-red-500 text-sm">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </magicLinkForm.Field>
        </div>

        <magicLinkForm.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? "Sending..." : "Send Magic Link"}
            </Button>
          )}
        </magicLinkForm.Subscribe>
          </form> : null}
          {showMagicSignup && showPasswordSignup ? (
            <AuthMethodDivider label="or use a password" />
          ) : null}
          {showPasswordSignup ? <PasswordSignUpForm /> : null}
        </div>
      )}

      <div className="mt-4 text-center">
        <Button
          variant="link"
          className="text-indigo-600 hover:text-indigo-800"
          render={
            isApplicationSignup ? (
              <a href={loginHref} />
            ) : (
              <Link to="/login" />
            )
          }
        >
          Already have an account? Sign In
        </Button>
      </div>
    </div>
  );
}
