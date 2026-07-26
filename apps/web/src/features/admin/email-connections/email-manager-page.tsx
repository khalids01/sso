import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  EyeOff,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { EmailConnection } from "./types";

type ConnectionFormValues = {
  name: string;
  provider: "resend" | "nodemailer";
  fromName: string;
  fromAddress: string;
  replyToAddress: string;
  secret: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
};

const emptyValues: ConnectionFormValues = {
  name: "",
  provider: "resend",
  fromName: "SSO",
  fromAddress: "",
  replyToAddress: "",
  secret: "",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUsername: "",
};

export function EmailManagerPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"current" | "archived">("current");
  const [formConnection, setFormConnection] =
    useState<EmailConnection | null | undefined>(undefined);
  const [testConnection, setTestConnection] = useState<EmailConnection | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<{
    connection: EmailConnection;
    action: "archive" | "restore";
  } | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.emailConnections.list(filter),
    queryFn: async () => {
      const { data, error } = await client.admin["email-connections"].get({
        query: { page: 1, limit: 100, filter },
      });
      if (error) throw error;
      return data as { items: EmailConnection[] };
    },
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.admin.emailConnections.all(),
    });
  const saveMutation = useMutation({
    mutationFn: async ({
      connection,
      values,
    }: {
      connection: EmailConnection | null;
      values: ConnectionFormValues;
    }) => {
      const common = {
        name: values.name.trim(),
        fromName: values.fromName.trim(),
        fromAddress: values.fromAddress.trim(),
        replyToAddress: values.replyToAddress.trim() || null,
      };
      if (connection) {
        const payload =
          connection.provider === "resend"
            ? { ...common, ...(values.secret ? { apiKey: values.secret } : {}) }
            : {
                ...common,
                smtpHost: values.smtpHost.trim(),
                smtpPort: values.smtpPort,
                smtpSecure: values.smtpSecure,
                smtpUsername: values.smtpUsername.trim(),
                ...(values.secret ? { smtpPassword: values.secret } : {}),
              };
        const { error } = await client.admin["email-connections"]({
          id: connection.id,
        }).patch(payload);
        if (error) throw error;
        return "updated";
      }
      const payload =
        values.provider === "resend"
          ? {
              ...common,
              provider: "resend" as const,
              apiKey: values.secret,
            }
          : {
              ...common,
              provider: "nodemailer" as const,
              smtpHost: values.smtpHost.trim(),
              smtpPort: values.smtpPort,
              smtpSecure: values.smtpSecure,
              smtpUsername: values.smtpUsername.trim() || undefined,
              smtpPassword: values.secret,
            };
      const { error } = await client.admin["email-connections"].post(payload);
      if (error) throw error;
      return "created";
    },
    onSuccess: (action) => {
      toast.success(`Email connection ${action}`);
      setFormConnection(undefined);
      invalidate();
    },
    onError: () => toast.error("Could not save the email connection"),
  });
  const lifecycleMutation = useMutation({
    mutationFn: async ({
      connection,
      action,
    }: {
      connection: EmailConnection;
      action: "archive" | "restore";
    }) => {
      const endpoint = client.admin["email-connections"]({ id: connection.id });
      const result =
        action === "archive"
          ? await endpoint.archive.post()
          : await endpoint.restore.post();
      if (result.error) throw result.error;
    },
    onSuccess: (_result, variables) => {
      toast.success(
        `Email connection ${variables.action === "archive" ? "archived" : "restored"}`,
      );
      setPendingLifecycle(null);
      invalidate();
    },
    onError: () => toast.error("Could not update the email connection"),
  });
  const testMutation = useMutation({
    mutationFn: async ({
      connection,
      to,
    }: {
      connection: EmailConnection;
      to: string;
    }) => {
      const { error } = await client.admin["email-connections"]({
        id: connection.id,
      }).test.post({ to });
      if (error) throw error;
    },
    onSuccess: (_result, variables) => {
      toast.success(`Test email sent to ${variables.to}`);
      setTestConnection(null);
    },
    onError: () => toast.error("The test email could not be sent"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Email Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable Resend and SMTP connections for application mail.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="inline-flex rounded-md border bg-muted/30 p-1">
            {(["current", "archived"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={filter === value ? "secondary" : "ghost"}
                onClick={() => setFilter(value)}
              >
                {value === "current" ? "Current" : "Archived"}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            disabled={listQuery.isFetching}
            onClick={() => listQuery.refetch()}
          >
            <RefreshCw
              className={cn("size-4", listQuery.isFetching && "animate-spin")}
            />
            Refresh
          </Button>
          <Button onClick={() => setFormConnection(null)}>
            <Plus className="size-4" />
            Add connection
          </Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <EmptyState>Loading email connections...</EmptyState>
      ) : listQuery.isError ? (
        <EmptyState destructive>Failed to load email connections.</EmptyState>
      ) : !listQuery.data?.items.length ? (
        <EmptyState>
          No {filter === "archived" ? "archived" : "current"} email connections.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listQuery.data.items.map((connection) => (
            <Card
              key={connection.id}
              className="min-h-64 overflow-hidden transition-colors hover:ring-foreground/20"
            >
              <CardHeader className="grid-cols-[1fr_auto] gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {connection.name}
                    </CardTitle>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {connection.provider === "nodemailer"
                        ? "Nodemailer / SMTP"
                        : "Resend"}
                    </p>
                  </div>
                </div>
                <CardAction>
                  <Badge
                    variant={
                      connection.status === "active" ? "secondary" : "outline"
                    }
                  >
                    {connection.status}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sender identity
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {connection.fromName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {connection.fromAddress}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Applications"
                    value={String(connection.applicationCount)}
                  />
                  <Metric
                    label="Credential"
                    value={`Version ${connection.credentialVersion}`}
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-3 bg-muted/20">
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(connection.updatedAt).toLocaleDateString()}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" size="sm" variant="outline">
                        <Settings className="size-4" />
                        Settings
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-52">
                    {filter === "current" ? (
                      <>
                        <DropdownMenuItem
                          onClick={() => setFormConnection(connection)}
                        >
                          <Pencil className="size-4" />
                          Edit connection
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={connection.status !== "active"}
                          onClick={() => setTestConnection(connection)}
                        >
                          <Send className="size-4" />
                          Send test email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() =>
                            setPendingLifecycle({
                              connection,
                              action: "archive",
                            })
                          }
                        >
                          <Archive className="size-4" />
                          Archive connection
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          setPendingLifecycle({
                            connection,
                            action: "restore",
                          })
                        }
                      >
                        <RotateCcw className="size-4" />
                        Restore connection
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ConnectionDialog
        connection={formConnection}
        isSaving={saveMutation.isPending}
        onOpenChange={(open) => !open && setFormConnection(undefined)}
        onSubmit={(values) =>
          saveMutation.mutateAsync({
            connection: formConnection ?? null,
            values,
          })
        }
      />
      <TestEmailDialog
        connection={testConnection}
        isSending={testMutation.isPending}
        onOpenChange={(open) => !open && setTestConnection(null)}
        onSubmit={(to) => {
          if (!testConnection) return Promise.resolve();
          return testMutation.mutateAsync({ connection: testConnection, to });
        }}
      />
      <LifecycleDialog
        pending={pendingLifecycle}
        isLoading={lifecycleMutation.isPending}
        onOpenChange={(open) => !open && setPendingLifecycle(null)}
        onConfirm={() => {
          if (pendingLifecycle) lifecycleMutation.mutate(pendingLifecycle);
        }}
      />
    </div>
  );
}

function ConnectionDialog(props: {
  connection: EmailConnection | null | undefined;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ConnectionFormValues) => Promise<unknown>;
}) {
  const form = useForm<ConnectionFormValues>({ defaultValues: emptyValues });
  const [showSecret, setShowSecret] = useState(false);
  const [isRevealingSecret, setIsRevealingSecret] = useState(false);
  const provider = form.watch("provider");
  useEffect(() => {
    const connection = props.connection;
    form.reset(
      connection
        ? {
            ...emptyValues,
            name: connection.name,
            provider: connection.provider,
            fromName: connection.fromName,
            fromAddress: connection.fromAddress,
            replyToAddress: connection.replyToAddress ?? "",
            smtpHost: connection.smtpHost ?? "",
            smtpPort: connection.smtpPort ?? 587,
            smtpSecure: connection.smtpSecure ?? false,
            smtpUsername: connection.smtpUsername ?? "",
          }
        : emptyValues,
    );
    setShowSecret(false);
  }, [form, props.connection]);

  return (
    <Dialog
      open={props.connection !== undefined}
      onOpenChange={props.onOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {props.connection ? "Edit email connection" : "Add email connection"}
          </DialogTitle>
          <DialogDescription>
            Credentials are encrypted and never returned by the API.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await props.onSubmit({
                ...values,
                secret: form.formState.dirtyFields.secret ? values.secret : "",
              });
            } catch {
              // Mutation feedback is shown by the page.
            }
          })}
        >
          <FormField label="Connection name" error={form.formState.errors.name?.message}>
            <Input
              {...form.register("name", { required: "Connection name is required" })}
            />
          </FormField>
          <Controller
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormField label="Provider">
                <Select
                  value={field.value}
                  disabled={Boolean(props.connection)}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {field.value === "resend" ? "Resend" : "Nodemailer / SMTP"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="nodemailer">
                      Nodemailer / SMTP
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="From name" error={form.formState.errors.fromName?.message}>
              <Input {...form.register("fromName", { required: "From name is required" })} />
            </FormField>
            <FormField label="From address" error={form.formState.errors.fromAddress?.message}>
              <Input
                type="email"
                {...form.register("fromAddress", {
                  required: "From address is required",
                })}
              />
            </FormField>
          </div>
          <FormField label="Reply-to address (optional)">
            <Input type="email" {...form.register("replyToAddress")} />
          </FormField>
          {provider === "nodemailer" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="SMTP host" error={form.formState.errors.smtpHost?.message}>
                  <Input {...form.register("smtpHost", { required: "SMTP host is required" })} />
                </FormField>
                <FormField label="SMTP port" error={form.formState.errors.smtpPort?.message}>
                  <Input
                    type="number"
                    {...form.register("smtpPort", {
                      valueAsNumber: true,
                      required: "SMTP port is required",
                      min: { value: 1, message: "Use a valid SMTP port" },
                      max: { value: 65535, message: "Use a valid SMTP port" },
                    })}
                  />
                </FormField>
              </div>
              <FormField label="SMTP username (optional)">
                <Input {...form.register("smtpUsername")} />
              </FormField>
              <Controller
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <Label htmlFor="smtp-secure">Use implicit TLS</Label>
                      <p className="text-xs text-muted-foreground">
                        Usually enabled for port 465.
                      </p>
                    </div>
                    <Switch
                      id="smtp-secure"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
            </>
          ) : null}
          <FormField
            label={
              provider === "resend" ? "Resend API key" : "SMTP password"
            }
            hint={
              props.connection
                ? "Leave blank to keep the current credential."
                : undefined
            }
            error={form.formState.errors.secret?.message}
          >
            <div className="flex gap-2">
              <Input
                type={showSecret ? "text" : "password"}
                autoComplete="new-password"
                placeholder={
                  props.connection ? "Current credential is hidden" : undefined
                }
                {...form.register("secret", {
                  validate: (value) =>
                    Boolean(props.connection) ||
                    Boolean(value.trim()) ||
                    "Credential is required",
                })}
              />
              {props.connection ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={isRevealingSecret}
                  title={showSecret ? "Hide credential" : "Show credential"}
                  aria-label={showSecret ? "Hide credential" : "Show credential"}
                  onClick={async () => {
                    if (showSecret) {
                      setShowSecret(false);
                      return;
                    }
                    if (!form.getValues("secret")) {
                      setIsRevealingSecret(true);
                      try {
                        const { data, error } = await client.admin[
                          "email-connections"
                        ]({ id: props.connection!.id }).secret.get();
                        if (error) throw error;
                        form.setValue("secret", data.secret, {
                          shouldDirty: false,
                        });
                      } catch {
                        toast.error("Could not reveal the credential");
                        return;
                      } finally {
                        setIsRevealingSecret(false);
                      }
                    }
                    setShowSecret(true);
                  }}
                >
                  {showSecret ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              ) : null}
            </div>
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={props.isSaving}>
              <ShieldCheck className="size-4" />
              {props.isSaving
                ? "Saving..."
                : props.connection
                  ? "Save changes"
                  : "Create connection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestEmailDialog(props: {
  connection: EmailConnection | null;
  isSending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (to: string) => Promise<unknown>;
}) {
  const form = useForm<{ to: string }>({ defaultValues: { to: "" } });
  useEffect(() => form.reset({ to: "" }), [form, props.connection]);
  return (
    <Dialog open={Boolean(props.connection)} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Send className="size-5" />
          </div>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>
            Confirm that {props.connection?.name} can deliver a branded message.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={form.handleSubmit(async ({ to }) => {
            try {
              await props.onSubmit(to);
            } catch {
              // Mutation feedback is shown by the page.
            }
          })}
        >
          <FormField
            label="Recipient email"
            hint={`The message will be sent from ${props.connection?.fromAddress ?? "this connection"}.`}
            error={form.formState.errors.to?.message}
          >
            <Input
              type="email"
              placeholder="you@example.com"
              autoFocus
              {...form.register("to", {
                required: "Recipient email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={props.isSending}>
              <Send className="size-4" />
              {props.isSending ? "Sending..." : "Send test email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleDialog(props: {
  pending: {
    connection: EmailConnection;
    action: "archive" | "restore";
  } | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const archive = props.pending?.action === "archive";
  return (
    <Dialog open={Boolean(props.pending)} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className={cn(
              "mb-2 flex size-11 items-center justify-center rounded-lg",
              archive
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            {archive ? <Archive className="size-5" /> : <RotateCcw className="size-5" />}
          </div>
          <DialogTitle>
            {archive ? "Archive email connection?" : "Restore email connection?"}
          </DialogTitle>
          <DialogDescription>
            {archive
              ? `${props.pending?.connection.name} will no longer be available for new email delivery. Existing application assignments remain visible.`
              : `${props.pending?.connection.name} will become available for application email delivery again.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={archive ? "destructive" : "default"}
            disabled={props.isLoading}
            onClick={props.onConfirm}
          >
            {archive ? <Archive className="size-4" /> : <RotateCcw className="size-4" />}
            {props.isLoading
              ? "Working..."
              : archive
                ? "Archive connection"
                : "Restore connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField(props: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      {props.children}
      {props.hint ? (
        <p className="text-xs text-muted-foreground">{props.hint}</p>
      ) : null}
      {props.error ? (
        <p className="text-xs text-destructive">{props.error}</p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function EmptyState(props: {
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-6 py-10 text-center text-sm text-muted-foreground",
        props.destructive && "text-destructive",
      )}
    >
      {props.children}
    </div>
  );
}
