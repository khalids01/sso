import { useEffect, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LockKeyholeOpen,
} from "lucide-react";
import { toast } from "sonner";
import { env } from "@env/public";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { revealOAuthConnectionSecret } from "./crud";
import type {
  OAuthConnection,
  OAuthConnectionInput,
  OAuthProviderId,
} from "./types";

const providers = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

export function OAuthConnectionForm(props: {
  connection?: OAuthConnection;
  isLoading: boolean;
  onSubmit: (input: OAuthConnectionInput) => void;
}) {
  const editing = Boolean(props.connection);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<OAuthProviderId>("google");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [secretDirty, setSecretDirty] = useState(false);
  const [credentialsLocked, setCredentialsLocked] = useState(editing);
  const [secretVisible, setSecretVisible] = useState(false);
  const [loadingSecret, setLoadingSecret] = useState(false);

  useEffect(() => {
    const connection = props.connection;
    setName(connection?.name ?? "");
    setProvider(connection?.provider ?? "google");
    setStatus(connection?.status === "disabled" ? "disabled" : "active");
    setClientId(connection?.clientId ?? "");
    setClientSecret("");
    setSecretDirty(false);
    setCredentialsLocked(Boolean(connection));
    setSecretVisible(false);
  }, [props.connection]);

  const callbackURL = `${new URL(env.VITE_SERVER_URL).origin}/api/auth/callback/${provider}`;

  async function loadSecret() {
    if (clientSecret) return clientSecret;
    if (!props.connection) return "";
    setLoadingSecret(true);
    try {
      const secret = await revealOAuthConnectionSecret(props.connection.id);
      setClientSecret(secret);
      return secret;
    } catch {
      toast.error("Could not reveal the saved client secret");
      return null;
    } finally {
      setLoadingSecret(false);
    }
  }

  return (
    <form
      className="grid gap-4 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || !clientId.trim() || (!editing && !clientSecret.trim())) {
          toast.error("Name, client ID and client secret are required");
          return;
        }
        props.onSubmit({
          name: name.trim(),
          provider,
          clientId: clientId.trim(),
          clientSecret:
            !editing || secretDirty ? clientSecret.trim() : "",
          status,
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="oauth-connection-name">Name</FieldLabel>
          <Input
            id="oauth-connection-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production Google"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="oauth-connection-provider">Provider</FieldLabel>
          <Select
            value={provider}
            disabled={editing}
            onValueChange={(value) => setProvider(value as OAuthProviderId)}
          >
            <SelectTrigger id="oauth-connection-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="oauth-connection-status">Status</FieldLabel>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as "active" | "disabled")}
        >
          <SelectTrigger id="oauth-connection-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <section className="grid gap-3 rounded-lg border bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Provider credentials</h3>
            <p className="text-xs text-muted-foreground">
              {credentialsLocked
                ? "The whole credential card is locked."
                : "Credentials are unlocked for editing."}
            </p>
          </div>
          {editing ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              title={credentialsLocked ? "Unlock credentials" : "Lock credentials"}
              disabled={loadingSecret}
              onClick={async () => {
                if (!credentialsLocked) {
                  setCredentialsLocked(true);
                  return;
                }
                const secret = await loadSecret();
                if (secret !== null) setCredentialsLocked(false);
              }}
            >
              {loadingSecret ? (
                <LoaderCircle className="animate-spin" />
              ) : credentialsLocked ? (
                <LockKeyhole />
              ) : (
                <LockKeyholeOpen />
              )}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="oauth-client-id">Client ID</FieldLabel>
            <Input
              id="oauth-client-id"
              autoComplete="off"
              readOnly={credentialsLocked}
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="oauth-client-secret">Client secret</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="oauth-client-secret"
                type={secretVisible ? "text" : "password"}
                autoComplete="new-password"
                readOnly={credentialsLocked}
                value={
                  credentialsLocked && !secretVisible
                    ? "••••••••••••••••"
                    : clientSecret
                }
                onChange={(event) => {
                  setClientSecret(event.target.value);
                  setSecretDirty(true);
                }}
              />
              {editing ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title={secretVisible ? "Hide secret" : "Reveal secret"}
                  disabled={loadingSecret}
                  onClick={async () => {
                    if (!secretVisible) {
                      const secret = await loadSecret();
                      if (secret === null) return;
                    }
                    setSecretVisible((current) => !current);
                  }}
                >
                  {loadingSecret ? (
                    <LoaderCircle className="animate-spin" />
                  ) : secretVisible ? (
                    <EyeOff />
                  ) : (
                    <Eye />
                  )}
                </Button>
              ) : null}
            </div>
          </Field>
        </div>

        <Field>
          <FieldLabel>Central callback URL</FieldLabel>
          <div className="flex gap-2">
            <Input readOnly className="font-mono text-xs" value={callbackURL} />
            <Button
              type="button"
              size="icon"
              variant="outline"
              title="Copy callback URL"
              onClick={async () => {
                await navigator.clipboard.writeText(callbackURL);
                toast.success("Callback URL copied");
              }}
            >
              <Copy />
            </Button>
          </div>
        </Field>
      </section>

      <DialogFooter>
        <Button type="submit" disabled={props.isLoading}>
          {props.isLoading
            ? "Saving..."
            : editing
              ? "Save connection"
              : "Create connection"}
        </Button>
      </DialogFooter>
    </form>
  );
}
