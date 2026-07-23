import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  type FieldError as HookFormFieldError,
  type UseFormRegisterReturn,
} from "react-hook-form";
import {
  Copy,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LockKeyholeOpen,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { env } from "@env/public";
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
import type { SocialProviderId } from "./crud/clients";

type ApplicationClientFormProps = {
  isLoading: boolean;
  onSubmit: (input: CreateApplicationClientInput) => void;
  onSubmitted: () => void;
  resetKey: string;
  initialValues?: CreateApplicationClientFormValues;
  submitLabel?: string;
  loadingLabel?: string;
  loadProviderSecret?: (provider: SocialProviderId) => Promise<string>;
};

export function ApplicationClientForm({
  isLoading,
  onSubmit,
  onSubmitted,
  resetKey,
  initialValues = createApplicationClientDefaults,
  submitLabel = "Save client",
  loadingLabel = "Saving...",
  loadProviderSecret,
}: ApplicationClientFormProps) {
  const form = useForm<
    CreateApplicationClientFormValues,
    unknown,
    CreateApplicationClientInput
  >({
    resolver: zodResolver(createApplicationClientSchema),
    defaultValues: initialValues,
  });
  const [revealedSecrets, setRevealedSecrets] = useState<
    Partial<Record<SocialProviderId, string>>
  >({});
  const [visibleSecrets, setVisibleSecrets] = useState<
    Partial<Record<SocialProviderId, boolean>>
  >({});
  const [unlockedSecrets, setUnlockedSecrets] = useState<
    Partial<Record<SocialProviderId, boolean>>
  >({});
  const [loadingSecret, setLoadingSecret] = useState<SocialProviderId | null>(
    null,
  );

  useEffect(() => {
    form.reset(initialValues);
    setRevealedSecrets({});
    setVisibleSecrets({});
    setUnlockedSecrets({});
    setLoadingSecret(null);
  }, [form, initialValues, resetKey]);

  const redirectUris = form.watch("redirectUris") ?? [""];
  const allowedOrigins = form.watch("allowedOrigins") ?? [""];
  const providerFields = [
    { id: "google", label: "Google", idLabel: "Client ID" },
    { id: "facebook", label: "Facebook", idLabel: "App ID" },
    { id: "github", label: "GitHub", idLabel: "Client ID" },
  ] as const;

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

      <div className="grid gap-3 border-t pt-4">
        <div>
          <h3 className="text-sm font-medium">Social provider credentials</h3>
          <p className="text-xs text-muted-foreground">
            Secrets are encrypted and will not be shown again after saving.
          </p>
        </div>
        {providerFields.map((provider) => {
          const idName = `${provider.id}ClientId` as const;
          const secretName = `${provider.id}ClientSecret` as const;
          const removeName =
            `remove${provider.id[0].toUpperCase()}${provider.id.slice(1)}Credentials` as
              | "removeGoogleCredentials"
              | "removeFacebookCredentials"
              | "removeGithubCredentials";
          const callbackURL = `${new URL(env.VITE_SERVER_URL).origin}/api/auth/callback/${provider.id}`;
          const configured = Boolean(initialValues[idName]?.trim());
          const removing = form.watch(removeName);
          const unlocked = !configured || Boolean(unlockedSecrets[provider.id]);
          const visible = Boolean(visibleSecrets[provider.id]);
          const loading = loadingSecret === provider.id;

          async function loadSecret() {
            const existing = revealedSecrets[provider.id];
            if (existing !== undefined) return existing;
            if (!loadProviderSecret) return "";
            setLoadingSecret(provider.id);
            try {
              const secret = await loadProviderSecret(provider.id);
              setRevealedSecrets((current) => ({
                ...current,
                [provider.id]: secret,
              }));
              return secret;
            } catch {
              toast.error(`Could not load the ${provider.label} secret`);
              return null;
            } finally {
              setLoadingSecret(null);
            }
          }

          return (
            <section
              key={provider.id}
              className="grid gap-3 rounded-lg border p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-medium">{provider.label}</h4>
                {configured ? (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" {...form.register(removeName)} />
                    Remove saved credentials
                  </label>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{provider.idLabel}</FieldLabel>
                  <Input
                    autoComplete="off"
                    disabled={removing}
                    {...form.register(idName)}
                  />
                  <FieldError errors={[form.formState.errors[idName]]} />
                </Field>
                <Field>
                  <FieldLabel>
                    {provider.id === "facebook" ? "App secret" : "Client secret"}
                  </FieldLabel>
                  <div className="flex gap-2">
                    {unlocked ? (
                      <Input
                        type={visible ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={removing}
                        placeholder="Enter the provider secret"
                        {...form.register(secretName)}
                      />
                    ) : (
                      <Input
                        type={visible ? "text" : "password"}
                        readOnly
                        disabled={removing}
                        value={
                          visible
                            ? revealedSecrets[provider.id] ?? ""
                            : "••••••••••••••••"
                        }
                        aria-label={`Locked ${provider.label} secret`}
                      />
                    )}
                    {configured ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={removing || loading}
                          title={visible ? "Hide saved secret" : "Reveal saved secret"}
                          onClick={async () => {
                            if (!visible) {
                              const secret = await loadSecret();
                              if (secret === null) return;
                            }
                            setVisibleSecrets((current) => ({
                              ...current,
                              [provider.id]: !visible,
                            }));
                          }}
                        >
                          {loading ? (
                            <LoaderCircle className="animate-spin" />
                          ) : visible ? (
                            <EyeOff />
                          ) : (
                            <Eye />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={removing || loading}
                          title={
                            unlocked
                              ? "Secret is unlocked for editing"
                              : "Unlock secret for editing"
                          }
                          onClick={async () => {
                            if (unlocked) return;
                            const secret = await loadSecret();
                            if (secret === null) return;
                            form.setValue(secretName, secret, {
                              shouldDirty: false,
                              shouldValidate: true,
                            });
                            setUnlockedSecrets((current) => ({
                              ...current,
                              [provider.id]: true,
                            }));
                          }}
                        >
                          {unlocked ? <LockKeyholeOpen /> : <LockKeyhole />}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </Field>
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">OAuth callback URL</span>
                <div className="flex gap-2">
                  <Input readOnly className="font-mono text-xs" value={callbackURL} />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(callbackURL);
                      toast.success(`${provider.label} callback URL copied`);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>

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
