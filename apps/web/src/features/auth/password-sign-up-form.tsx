import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useHydrated } from "@/hooks/use-hydrated";
import { client } from "@/lib/client";

import { getAuthCallbackURL } from "./auth-callback";

const passwordSignupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(15, "Use at least 15 characters")
    .max(128, "Use at most 128 characters"),
});

type PasswordSignupValues = z.infer<typeof passwordSignupSchema>;

export function PasswordSignUpForm() {
  const hydrated = useHydrated();
  const form = useForm<PasswordSignupValues>({
    resolver: zodResolver(passwordSignupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const callbackURL = getAuthCallbackURL();
    const { data, error } = await client.auth.password.signup.post({
      ...values,
      callbackURL,
    });

    if (error) {
      const value = error.value as { message?: string } | undefined;
      toast.error(value?.message ?? "Password signup failed");
      return;
    }

    if (
      data &&
      "requiresEmailVerification" in data &&
      data.requiresEmailVerification
    ) {
      toast.success("Account created. Check your email to verify it.");
      return;
    }

    window.location.assign(callbackURL);
  });

  return (
    <form
      aria-label="Password signup"
      className="space-y-4"
      onSubmit={onSubmit}
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="password-signup-name">Name</FieldLabel>
        <Input
          id="password-signup-name"
          autoComplete="name"
          disabled={!hydrated}
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register("name")}
        />
        <FieldError errors={[form.formState.errors.name]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="password-signup-email">Email</FieldLabel>
        <Input
          id="password-signup-email"
          type="email"
          autoComplete="email"
          disabled={!hydrated}
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="password-signup-password">Password</FieldLabel>
        <Input
          id="password-signup-password"
          type="password"
          autoComplete="new-password"
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
        {form.formState.isSubmitting
          ? "Creating account..."
          : "Create account with password"}
      </Button>
    </form>
  );
}
