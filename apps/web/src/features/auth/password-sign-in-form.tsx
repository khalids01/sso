import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useHydrated } from "@/hooks/use-hydrated";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

import { getAuthCallbackURL } from "./auth-callback";
import {
  passwordSignInSchema,
  type PasswordSignInValues,
} from "./sign-in-schema";

export function PasswordSignInForm() {
  const hydrated = useHydrated();
  const form = useForm<PasswordSignInValues>({
    resolver: zodResolver(passwordSignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const callbackURL = getAuthCallbackURL();
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL,
    });

    if (error) {
      toast.error(
        error.status === 400
          ? "Password authentication is unavailable"
          : "Invalid email or password",
      );
      return;
    }

    window.location.assign(callbackURL);
  });

  return (
    <form
      aria-label="Password sign in"
      className="space-y-4"
      onSubmit={onSubmit}
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="password-email">Email</FieldLabel>
        <Input
          id="password-email"
          type="email"
          autoComplete="email"
          disabled={!hydrated}
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={!hydrated}
          aria-invalid={Boolean(form.formState.errors.password)}
          {...form.register("password")}
        />
        <FieldError errors={[form.formState.errors.password]} />
      </Field>

      <Button
        className="w-full"
        type="submit"
        disabled={!hydrated || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Signing in..." : "Sign in with password"}
      </Button>
    </form>
  );
}
