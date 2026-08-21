import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Permissions } from "@sso/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/constants/query-keys";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { useSession } from "@/providers/session-provider";
import { ApplicationManagementHeader } from "../components/application-management-header";
import { getApplication } from "../crud/applications";
import {
  getWebhookEndpoint,
  listWebhookDeliveries,
  updateWebhookEndpoint,
} from "../crud/webhooks";
import { showMutationError } from "../lifecycle";
import type { UserWebhookEventType } from "../types";

const availableEvents: Array<{ value: UserWebhookEventType; label: string; description: string }> = [
  { value: "user.created", label: "User created", description: "A user first gains access to this application." },
  { value: "user.updated", label: "User updated", description: "Webhook-visible identity or account-status fields changed." },
  { value: "user.deleted", label: "User deleted", description: "The SSO user was permanently deleted." },
];

export function ApplicationWebhooksPage({ applicationId }: { applicationId: string }) {
  const { session } = useSession();
  const canManage = sessionHasPermission(session?.permissions ?? [], Permissions.AdminApplicationsManage);
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<UserWebhookEventType[]>(availableEvents.map(({ value }) => value));
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applicationQuery = useQuery({
    queryKey: queryKeys.admin.applications.detail(applicationId),
    queryFn: () => getApplication(applicationId),
  });
  const endpointQuery = useQuery({
    queryKey: queryKeys.admin.applications.webhooks(applicationId),
    queryFn: () => getWebhookEndpoint(applicationId),
  });
  const deliveriesQuery = useQuery({
    queryKey: queryKeys.admin.applications.webhookDeliveries(applicationId),
    queryFn: () => listWebhookDeliveries(applicationId),
  });

  useEffect(() => {
    const endpoint = endpointQuery.data;
    if (!endpoint) return;
    setUrl(endpoint.url);
    setEnabled(endpoint.enabled);
    setEvents(endpoint.subscribedEvents);
  }, [endpointQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateWebhookEndpoint,
    onSuccess: (endpoint) => {
      setSecret(endpoint.secret);
      toast.success(endpoint.secret ? "Webhook saved. Copy the secret now." : "User webhook updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.applications.webhooks(applicationId) });
    },
    onError: showMutationError("Failed to update user webhook"),
  });

  const application = applicationQuery.data;
  if (!application) {
    return <div className="rounded-md border px-6 py-12 text-center text-sm text-muted-foreground">Loading application...</div>;
  }

  const toggleEvent = (event: UserWebhookEventType, checked: boolean) => {
    setEvents((current) => checked ? [...new Set([...current, event])] : current.filter((value) => value !== event));
  };
  const save = (rotateSecret = false) => {
    setSecret(null);
    saveMutation.mutate({ applicationId, url: url.trim(), enabled, subscribedEvents: events, rotateSecret });
  };
  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Webhook secret copied");
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      toast.error("Could not copy webhook secret");
    }
  };

  return (
    <div className="space-y-6">
      <ApplicationManagementHeader application={application} section="webhooks" />

      <Card>
        <CardHeader>
          <CardTitle>User webhooks</CardTitle>
          <CardDescription>
            Sends signed user lifecycle events to this application. This is shared by all of its OAuth clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="user-webhook-url">Endpoint URL</Label>
            <Input
              id="user-webhook-url"
              value={url}
              disabled={!canManage}
              placeholder="https://app.example.com/api/sso/webhooks"
              onChange={(event) => setUrl(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Use a separate server route; do not use the /auth/[...sso] handler.</p>
          </div>

          <div className="space-y-3">
            <Label>Subscribed events</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {availableEvents.map((event) => (
                <label key={event.value} className="flex cursor-pointer gap-3 rounded-md border p-3 text-sm">
                  <Checkbox
                    checked={events.includes(event.value)}
                    disabled={!canManage}
                    onCheckedChange={(checked) => toggleEvent(event.value, checked === true)}
                  />
                  <span>
                    <span className="block font-medium">{event.label}</span>
                    <span className="text-xs text-muted-foreground">{event.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-3">
            <div>
              <p className="font-medium">Delivery enabled</p>
              <p className="text-xs text-muted-foreground">The SSO server feature flag must also be enabled.</p>
            </div>
            <Switch checked={enabled} disabled={!canManage} onCheckedChange={setEnabled} />
          </div>

          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button className="gap-2" disabled={!url.trim() || events.length === 0 || saveMutation.isPending} onClick={() => save()}>
                <Save className="h-4 w-4" /> Save webhook
              </Button>
              {endpointQuery.data ? (
                <Button variant="outline" className="gap-2" disabled={!url.trim() || saveMutation.isPending} onClick={() => save(true)}>
                  <RotateCcw className="h-4 w-4" /> Rotate secret
                </Button>
              ) : null}
            </div>
          ) : null}

          {secret ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="font-medium">Copy this webhook secret now</p>
              <p className="mt-1 text-xs text-muted-foreground">For security it is shown only after creation or rotation. Save it as server-only SSO_WEBHOOK_SECRET in the receiving application.</p>
              <div className="mt-3 flex gap-2">
                <Input value={secret} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => void copySecret()}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent deliveries</CardTitle>
              <CardDescription>Use the stable event ID in the receiver to deduplicate retried requests.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => deliveriesQuery.refetch()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(deliveriesQuery.data ?? []).map((delivery) => (
            <div key={delivery.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{delivery.status}</Badge><span className="text-sm font-medium">{delivery.eventType}</span></div>
                <p className="mt-1 text-xs text-muted-foreground">Attempts: {delivery.attemptCount} · {new Date(delivery.createdAt).toLocaleString()}{delivery.lastErrorCode ? ` · ${delivery.lastErrorCode}` : ""}</p>
              </div>
              {delivery.lastHttpStatus ? <span className="text-xs text-muted-foreground">HTTP {delivery.lastHttpStatus}</span> : null}
            </div>
          ))}
          {!deliveriesQuery.isLoading && (deliveriesQuery.data?.length ?? 0) === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No user webhook deliveries yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
