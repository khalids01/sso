import { Check, Copy, ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { env } from "@env/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApplicationClient } from "../../types";
import { StatusBadge } from "../../components/ui-controls";

const providerIds = [
  ["Google", "google"],
  ["Facebook", "facebook"],
  ["LinkedIn", "linkedin"],
  ["GitHub", "github"],
  ["Instagram", "instagram"],
] as const;

function getSsoUrl() {
  return new URL(env.VITE_SERVER_URL).origin;
}

function getRequiredEnvironment(client: ApplicationClient) {
  return [
    `SSO_URL=${getSsoUrl()}`,
    `SSO_CLIENT_ID=${client.clientId}`,
    `SSO_CALLBACK_URL=${client.redirectUris[0] ?? ""}`,
  ].join("\n");
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      className="shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Copied to clipboard");
          window.setTimeout(() => setCopied(false), 1_500);
        } catch {
          toast.error("Could not copy to clipboard");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <code className="min-w-0 break-all text-xs">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

export function ClientViewDialog({
  client,
  onOpenChange,
}: {
  client: ApplicationClient | null;
  onOpenChange: (open: boolean) => void;
}) {
  const ssoUrl = getSsoUrl();

  return (
    <Dialog open={Boolean(client)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Client details</DialogTitle>
              <DialogDescription>
                {client
                  ? `${client.name} — copy the exact values needed by this application.`
                  : "Copy the exact values needed by this application."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {client ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{client.clientType}</Badge>
              <StatusBadge status={client.status} />
              <span className="font-mono text-xs text-muted-foreground">
                {client.clientId}
              </span>
            </div>

            <section className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Required environment</h3>
                  <p className="text-xs text-muted-foreground">
                    Only these three values are required by the reference app.
                  </p>
                </div>
                <CopyButton value={getRequiredEnvironment(client)} label="Copy env" />
              </div>
              <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs leading-6">
                <code>{getRequiredEnvironment(client)}</code>
              </pre>
              {client.redirectUris.length > 1 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The env block uses the first registered callback. Copy a different
                  callback below when configuring another deployment.
                </p>
              ) : null}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Registered URLs</h3>
                  <p className="text-xs text-muted-foreground">
                    Exact callback URLs and browser origins accepted for this client.
                  </p>
                </div>
                <CopyButton
                  value={[...client.redirectUris, ...client.allowedOrigins].join("\n")}
                  label="Copy all"
                />
              </div>
              <div className="space-y-2">
                {client.redirectUris.map((url, index) => (
                  <CopyRow
                    key={`callback:${url}`}
                    label={`Callback ${index + 1}`}
                    value={url}
                  />
                ))}
                {client.allowedOrigins.map((url, index) => (
                  <CopyRow
                    key={`origin:${url}`}
                    label={`Origin ${index + 1}`}
                    value={url}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">SSO endpoints</h3>
                <p className="text-xs text-muted-foreground">
                  Useful server-side OAuth and verification URLs. They are derived
                  from SSO_URL and do not need separate environment variables.
                </p>
              </div>
              <div className="space-y-2">
                <CopyRow label="Authorize" value={`${ssoUrl}/api/auth/oauth2/authorize`} />
                <CopyRow label="Token" value={`${ssoUrl}/api/auth/oauth2/token`} />
                <CopyRow label="JWKS" value={`${ssoUrl}/api/auth/jwks`} />
                <CopyRow
                  label="Client metadata"
                  value={`${ssoUrl}/api/oauth/client-metadata?client_id=${encodeURIComponent(client.clientId)}`}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Social provider callbacks</h3>
                <p className="text-xs text-muted-foreground">
                  These belong in each provider console. Only use a callback after
                  that provider has been enabled on the SSO server.
                </p>
              </div>
              <div className="space-y-2">
                {providerIds.map(([name, providerId]) => (
                  <CopyRow
                    key={providerId}
                    label={name}
                    value={`${ssoUrl}/api/auth/callback/${providerId}`}
                  />
                ))}
              </div>
            </section>

            <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
              <span>Updated {new Date(client.updatedAt).toLocaleString()}</span>
              <a
                href={`${ssoUrl}/api/oauth/client-metadata?client_id=${encodeURIComponent(client.clientId)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Open metadata <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
