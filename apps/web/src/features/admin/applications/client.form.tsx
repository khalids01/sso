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
  createApplicationClientDefaults,
  createApplicationClientSchema,
  type CreateApplicationClientFormValues,
  type CreateApplicationClientInput,
} from "./schema";

type CreateApplicationClientFormProps = {
  isLoading: boolean;
  onCreate: (input: CreateApplicationClientInput) => void;
  onCreated: () => void;
  resetKey: string;
};

export function CreateApplicationClientForm({
  isLoading,
  onCreate,
  onCreated,
  resetKey,
}: CreateApplicationClientFormProps) {
  const form = useForm<
    CreateApplicationClientFormValues,
    unknown,
    CreateApplicationClientInput
  >({
    resolver: zodResolver(createApplicationClientSchema),
    defaultValues: createApplicationClientDefaults,
  });

  useEffect(() => {
    form.reset(createApplicationClientDefaults);
  }, [form, resetKey]);

  return (
    <form
      className="grid gap-4 py-2"
      onSubmit={form.handleSubmit((input) => {
        onCreate(input);
        onCreated();
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

      <Field>
        <FieldLabel htmlFor="redirect-uris">Redirect URIs</FieldLabel>
        <Textarea
          id="redirect-uris"
          className="min-h-28 font-mono text-xs"
          placeholder={
            "https://app.example.com/auth/callback\nhttp://localhost:5002/auth/callback"
          }
          aria-invalid={Boolean(form.formState.errors.redirectUris)}
          {...form.register("redirectUris")}
        />
        <FieldError errors={[form.formState.errors.redirectUris]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="allowed-origins">Allowed origins</FieldLabel>
        <Textarea
          id="allowed-origins"
          className="min-h-24 font-mono text-xs"
          placeholder={"https://app.example.com\nhttp://localhost:5002"}
          aria-invalid={Boolean(form.formState.errors.allowedOrigins)}
          {...form.register("allowedOrigins")}
        />
        <FieldError errors={[form.formState.errors.allowedOrigins]} />
      </Field>

      <DialogFooter>
        <Button disabled={isLoading} type="submit">
          {isLoading ? "Creating..." : "Create client"}
        </Button>
      </DialogFooter>
    </form>
  );
}
