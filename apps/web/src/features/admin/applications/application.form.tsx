import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
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

function getOAuthConnectionLabel(
  options: OAuthConnectionOption[],
  value: string | null | undefined,
) {
  if (!value) return "Not assigned";
  const selected = options.find((option) => option.id === value);
  if (!selected) return "Unavailable connection";
  return `${selected.name}${
    selected.status !== "active" ? ` (${selected.status})` : ""
  }`;
}

type ApplicationFormProps = {
  isLoading: boolean;
  onSubmit: (input: CreateApplicationInput) => Promise<void> | void;
  onSubmitted: () => void;
  resetKey: string;
  initialValues?: CreateApplicationFormValues;
  submitLabel?: string;
  loadingLabel?: string;
  oauthConnectionOptions?: OAuthConnectionOption[];
  errorMessage?: string | null;
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
  errorMessage,
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
      onSubmit={form.handleSubmit(async (input) => {
        try {
          await onSubmit(input);
          onSubmitted();
        } catch {
          // The mutation displays the server response and keeps the form open.
        }
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

      <div className="grid gap-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium">OAuth connections</h3>
            <p className="text-xs text-muted-foreground">
              Optionally assign reusable upstream connections. Assignment does
              not enable sign-in or signup; configure those later from
              Authentication Settings.
            </p>
            {oauthConnectionOptions.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                No active OAuth connections are available. You can create the
                application now and add connections later in{" "}
                <Link to="/admin/oauth-manager" className="underline">
                  OAuth Manager
                </Link>
                .
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {oauthProviders.map((provider) => (
              <Controller
                key={provider.id}
                control={form.control}
                name={`oauthConnections.${provider.id}`}
                render={({ field }) => (
                  <Field>
                    <FieldLabel
                      htmlFor={`application-oauth-${provider.id}`}
                    >
                      {provider.label}
                    </FieldLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                    >
                      <SelectTrigger
                        id={`application-oauth-${provider.id}`}
                        className="w-full"
                      >
                        <SelectValue>
                          {getOAuthConnectionLabel(
                            oauthConnectionOptions,
                            field.value,
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not assigned</SelectItem>
                        {oauthConnectionOptions
                          .filter((option) => option.provider === provider.id)
                          .map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                              {option.status !== "active"
                                ? ` (${option.status})`
                                : ""}
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

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errorMessage}
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
  onCreate: (input: CreateApplicationInput) => Promise<void>;
  onCreated: () => void;
  resetKey: string;
  oauthConnectionOptions?: OAuthConnectionOption[];
  errorMessage?: string | null;
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
      errorMessage={props.errorMessage}
    />
  );
}
