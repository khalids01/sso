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

type CreateApplicationFormProps = {
  isLoading: boolean;
  onCreate: (input: CreateApplicationInput) => void;
  onCreated: () => void;
  resetKey: string;
};

export function CreateApplicationForm({
  isLoading,
  onCreate,
  onCreated,
  resetKey,
}: CreateApplicationFormProps) {
  const form = useForm<
    CreateApplicationFormValues,
    unknown,
    CreateApplicationInput
  >({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: createApplicationDefaults,
  });

  useEffect(() => {
    form.reset(createApplicationDefaults);
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

      <DialogFooter>
        <Button disabled={isLoading} type="submit">
          {isLoading ? "Creating..." : "Create application"}
        </Button>
      </DialogFooter>
    </form>
  );
}
