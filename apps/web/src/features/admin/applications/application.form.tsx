import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createApplicationDefaults,
  createApplicationSchema,
  type CreateApplicationFormValues,
  type CreateApplicationInput,
} from "./schema";

type ApplicationFormProps = {
  isLoading: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
  onSubmitted: () => void;
  resetKey: string;
  initialValues?: CreateApplicationFormValues;
  submitLabel?: string;
  loadingLabel?: string;
};

export function ApplicationForm({
  isLoading,
  onSubmit,
  onSubmitted,
  resetKey,
  initialValues = createApplicationDefaults,
  submitLabel = "Save application",
  loadingLabel = "Saving...",
}: ApplicationFormProps) {
  const form = useForm<
    CreateApplicationFormValues,
    unknown,
    CreateApplicationInput
  >({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues, resetKey]);

  return (
    <form
      className="grid gap-4 py-2"
      onSubmit={form.handleSubmit((input) => {
        onSubmit(input);
        onSubmitted();
      })}
    >
      <Field>
        <FieldLabel htmlFor="application-name">Name</FieldLabel>
        <Input
          id="application-name"
          placeholder="Customer Dashboard"
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register("name")}
        />
        <FieldError errors={[form.formState.errors.name]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="application-slug">Slug</FieldLabel>
        <Input
          id="application-slug"
          placeholder="customer-dashboard"
          aria-invalid={Boolean(form.formState.errors.slug)}
          {...form.register("slug")}
        />
        <FieldError errors={[form.formState.errors.slug]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="application-description">Description</FieldLabel>
        <Textarea
          id="application-description"
          placeholder="Internal or customer-facing app"
          aria-invalid={Boolean(form.formState.errors.description)}
          {...form.register("description")}
        />
        <FieldError errors={[form.formState.errors.description]} />
      </Field>

      <Controller
        control={form.control}
        name="status"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="application-status">Status</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="application-status"
                className="w-full"
                aria-invalid={Boolean(fieldState.error)}
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="grid gap-3 rounded-md border p-4">
        <div>
          <p className="text-sm font-medium">Application sign-in</p>
          <p className="text-xs text-muted-foreground">
            Choose the methods shown to users of this application.
          </p>
        </div>
        <Controller
          control={form.control}
          name="signInMethods"
          render={({ field }) => (
            <div className="grid gap-3">
              {(["magic_link", "password"] as const).map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value.includes(method)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...field.value, method]
                        : field.value.filter((value) => value !== method);
                      field.onChange(next);
                      if (method === "magic_link" && !checked) {
                        form.setValue("signUpMethods", []);
                      }
                    }}
                  />
                  {method === "magic_link" ? "Email magic link" : "Email and password"}
                </label>
              ))}
              <FieldError errors={[form.formState.errors.signInMethods]} />
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="registrationMode"
          render={({ field, fieldState }) => (
            <Field>
              <FieldLabel>Account registration</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full" aria-invalid={Boolean(fieldState.error)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="invite_only">Invitation only</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="signUpMethods"
          render={({ field }) => (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={
                  form.watch("registrationMode") !== "closed" &&
                  field.value.includes("magic_link")
                }
                disabled={
                  form.watch("registrationMode") === "closed" ||
                  !form.watch("signInMethods").includes("magic_link")
                }
                onCheckedChange={(checked) =>
                  field.onChange(checked ? ["magic_link"] : [])
                }
              />
              <span>
                Allow signup by email magic link
                <span className="block text-xs text-muted-foreground">
                  Password signup stays unavailable until its verification-email flow is configured.
                </span>
              </span>
            </label>
          )}
        />
      </div>

      <DialogFooter>
        <Button disabled={isLoading} type="submit">
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

type CreateApplicationFormProps = {
  isLoading: boolean;
  onCreate: (input: CreateApplicationInput) => void;
  onCreated: () => void;
  resetKey: string;
};

export function CreateApplicationForm(props: CreateApplicationFormProps) {
  return (
    <ApplicationForm
      isLoading={props.isLoading}
      onSubmit={props.onCreate}
      onSubmitted={props.onCreated}
      resetKey={props.resetKey}
      submitLabel="Create application"
      loadingLabel="Creating..."
    />
  );
}
