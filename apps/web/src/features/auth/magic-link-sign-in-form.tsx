import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { client } from "@/lib/client";

import { getAuthCallbackURL } from "./auth-callback";
import { emailSchema, type EmailSignInValues } from "./sign-in-schema";
import { useHydrated } from "./use-hydrated";

export function MagicLinkSignInForm() {
  const hydrated = useHydrated();
  const form = useForm<EmailSignInValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const { error } = await client.auth["magic-link"].login.post({
      email: values.email,
      callbackURL: getAuthCallbackURL(),
    });

    if (error) {
      toast.error("Failed to send magic link");
      return;
    }

    toast.success("Magic link sent! Check your email.");
    form.reset();
  });

  return (
    <form
      aria-label="Magic link sign in"
      className="space-y-4"
      onSubmit={onSubmit}
      noValidate
    >
      <Field>
        <FieldLabel htmlFor="magic-email">Email</FieldLabel>
        <Input
          id="magic-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={!hydrated}
          aria-invalid={Boolean(form.formState.errors.email)}
          {...form.register("email")}
        />
        <FieldError errors={[form.formState.errors.email]} />
      </Field>

      <Button
        className="w-full"
        type="submit"
        variant="outline"
        disabled={!hydrated || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Sending..." : "Send magic link"}
      </Button>
    </form>
  );
}
