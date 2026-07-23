import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import type { OAuthConnectionOption } from "../oauth-connections/types";

const oauthProviders = [
  { id: "google", label: "Google" },
  { id: "facebook", label: "Facebook" },
  { id: "github", label: "GitHub" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

type ApplicationFormProps = {
  isLoading: boolean;
  onSubmit: (input: CreateApplicationInput) => void;
  onSubmitted: () => void;
  resetKey: string;
  initialValues?: CreateApplicationFormValues;
  submitLabel?: string;
  loadingLabel?: string;
  oauthConnectionOptions?: OAuthConnectionOption[];
  showOAuthConnections?: boolean;
};

export function ApplicationForm({
  isLoading,
  onSubmit,
  onSubmitted,
  resetKey,
  initialValues = createApplicationDefaults,
  submitLabel = "Save application",
  loadingLabel = "Saving...",
  oauthConnectionOptions = [],
  showOAuthConnections = true,
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

      {showOAuthConnections ? (
      <div className="grid gap-3 border-t pt-4">
        <div>
          <h3 className="text-sm font-medium">OAuth connections</h3>
          <p className="text-xs text-muted-foreground">
            Select the reusable upstream connection for each provider.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {oauthProviders.map((provider) => (
            <Controller
              key={provider.id}
              control={form.control}
              name={`oauthConnections.${provider.id}`}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{provider.label}</FieldLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      {oauthConnectionOptions
                        .filter((option) => option.provider === provider.id)
                        .map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          ))}
        </div>
      </div>
      ) : null}

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
  oauthConnectionOptions?: OAuthConnectionOption[];
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
      oauthConnectionOptions={props.oauthConnectionOptions}
    />
  );
}
