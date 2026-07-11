import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  type FieldError as HookFormFieldError,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { Plus, X } from "lucide-react";
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
import {
  createApplicationClientDefaults,
  createApplicationClientSchema,
  type CreateApplicationClientFormValues,
  type CreateApplicationClientInput,
} from "./schema";

type ApplicationClientFormProps = {
  isLoading: boolean;
  onSubmit: (input: CreateApplicationClientInput) => void;
  onSubmitted: () => void;
  resetKey: string;
  initialValues?: CreateApplicationClientFormValues;
  submitLabel?: string;
  loadingLabel?: string;
};

export function ApplicationClientForm({
  isLoading,
  onSubmit,
  onSubmitted,
  resetKey,
  initialValues = createApplicationClientDefaults,
  submitLabel = "Save client",
  loadingLabel = "Saving...",
}: ApplicationClientFormProps) {
  const form = useForm<
    CreateApplicationClientFormValues,
    unknown,
    CreateApplicationClientInput
  >({
    resolver: zodResolver(createApplicationClientSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    form.reset(initialValues);
  }, [form, initialValues, resetKey]);

  const redirectUris = form.watch("redirectUris") ?? [""];
  const allowedOrigins = form.watch("allowedOrigins") ?? [""];

  function updateUrlList(
    name: "redirectUris" | "allowedOrigins",
    nextValue: string[],
  ) {
    form.setValue(name, nextValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <form
      className="grid gap-4 py-2"
      onSubmit={form.handleSubmit((input) => {
        onSubmit(input);
        onSubmitted();
      })}
    >
      <Field>
        <FieldLabel htmlFor="client-name">Name</FieldLabel>
        <Input
          id="client-name"
          placeholder="Web client"
          aria-invalid={Boolean(form.formState.errors.name)}
          {...form.register("name")}
        />
        <FieldError errors={[form.formState.errors.name]} />
      </Field>

      <Controller
        control={form.control}
        name="status"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel htmlFor="client-status">Status</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="client-status"
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

      <UrlInputList
        label="Redirect URIs"
        addLabel="Add redirect URI"
        placeholder="https://app.example.com/auth/callback"
        values={redirectUris}
        errors={form.formState.errors.redirectUris}
        register={(index) => form.register(`redirectUris.${index}`)}
        onAdd={() => updateUrlList("redirectUris", [...redirectUris, ""])}
        onRemove={(index) =>
          updateUrlList(
            "redirectUris",
            redirectUris.filter((_, itemIndex) => itemIndex !== index),
          )
        }
      />

      <UrlInputList
        label="Allowed origins"
        addLabel="Add origin"
        placeholder="https://app.example.com"
        values={allowedOrigins}
        errors={form.formState.errors.allowedOrigins}
        register={(index) => form.register(`allowedOrigins.${index}`)}
        onAdd={() => updateUrlList("allowedOrigins", [...allowedOrigins, ""])}
        onRemove={(index) =>
          updateUrlList(
            "allowedOrigins",
            allowedOrigins.filter((_, itemIndex) => itemIndex !== index),
          )
        }
      />

      <DialogFooter>
        <Button disabled={isLoading} type="submit">
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UrlInputList(props: {
  label: string;
  addLabel: string;
  placeholder: string;
  values: string[];
  errors: unknown;
  register: (index: number) => UseFormRegisterReturn;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const canRemove = props.values.length > 1;

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{props.label}</FieldLabel>
        <Button type="button" variant="outline" size="sm" onClick={props.onAdd}>
          <Plus className="h-4 w-4" />
          {props.addLabel}
        </Button>
      </div>

      <div className="grid gap-2">
        {props.values.map((_, index) => {
          const fieldError = getArrayFieldError(props.errors, index);

          return (
            <div
              key={`${props.label}-${index}-${props.values.length}`}
              className="grid gap-1"
            >
              <div className="flex gap-2">
                <Input
                  className="font-mono text-xs"
                  placeholder={props.placeholder}
                  aria-invalid={Boolean(fieldError)}
                  {...props.register(index)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canRemove}
                  onClick={() => props.onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <FieldError errors={fieldError ? [fieldError] : []} />
            </div>
          );
        })}
      </div>
    </Field>
  );
}

function getArrayFieldError(errors: unknown, index: number) {
  if (!Array.isArray(errors)) {
    return undefined;
  }

  return errors[index] as HookFormFieldError | undefined;
}

type CreateApplicationClientFormProps = {
  isLoading: boolean;
  onCreate: (input: CreateApplicationClientInput) => void;
  onCreated: () => void;
  resetKey: string;
};

export function CreateApplicationClientForm(
  props: CreateApplicationClientFormProps,
) {
  return (
    <ApplicationClientForm
      isLoading={props.isLoading}
      onSubmit={props.onCreate}
      onSubmitted={props.onCreated}
      resetKey={props.resetKey}
      submitLabel="Create client"
      loadingLabel="Creating..."
    />
  );
}
