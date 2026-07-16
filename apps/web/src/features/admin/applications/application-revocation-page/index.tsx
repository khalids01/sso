import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Permissions } from "@rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { queryKeys } from "@/constants/query-keys";
import { sessionHasPermission } from "@/features/user/lib/session-permissions";
import { useSession } from "@/providers/session-provider";
import { ApplicationManagementHeader } from "../components/application-management-header";
import { getApplication } from "../crud/applications";
import {
  getRevocationEndpoint,
  listRevocationDeliveries,
  retryRevocationDelivery,
  updateRevocationEndpoint,
} from "../crud/revocation";

export function ApplicationRevocationPage({ applicationId }: { applicationId: string }) {
  const { session } = useSession();
  const canManage = sessionHasPermission(
    session?.permissions ?? [],
    Permissions.AdminApplicationsManage,
  );
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const applicationQuery = useQuery({
    queryKey: queryKeys.admin.applications.detail(applicationId),
    queryFn: () => getApplication(applicationId),
  });
  const endpointQuery = useQuery({
    queryKey: queryKeys.admin.applications.revocation(applicationId),
    queryFn: () => getRevocationEndpoint(applicationId),
  });
  const deliveriesQuery = useQuery({
    queryKey: queryKeys.admin.applications.revocationDeliveries(applicationId),
    queryFn: () => listRevocationDeliveries(applicationId),
  });

  useEffect(() => {
    if (!endpointQuery.data) return;
    setUrl(endpointQuery.data.url);
    setEnabled(endpointQuery.data.enabled);
  }, [endpointQuery.data]);

  const saveMutation = useMutation({
    mutationFn: updateRevocationEndpoint,
    onSuccess: () => {
      toast.success("Revocation webhook updated");
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.revocation(applicationId),
      });
    },
    onError: () => toast.error("Failed to update revocation webhook"),
  });
  const retryMutation = useMutation({
    mutationFn: retryRevocationDelivery,
    onSuccess: () => {
      toast.success("Delivery queued for retry");
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.applications.revocationDeliveries(applicationId),
      });
    },
    onError: () => toast.error("Failed to retry delivery"),
  });

  const application = applicationQuery.data;
  if (!application) {
    return <div className="rounded-md border px-6 py-12 text-center text-sm text-muted-foreground">Loading application...</div>;
  }

  return (
    <div className="space-y-6">
      <ApplicationManagementHeader application={application} section="revocation" />
      <Card>
        <CardHeader>
          <CardTitle>Revocation webhook</CardTitle>
          <CardDescription>
            Sends signed, application-audienced events when access is invalidated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="revocation-webhook-url">Endpoint URL</Label>
            <Input
              id="revocation-webhook-url"
              value={url}
              disabled={!canManage}
              placeholder="https://app.example.com/sso/revocations"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-3">
            <div>
              <p className="font-medium">Delivery enabled</p>
              <p className="text-xs text-muted-foreground">The server feature flag must also be enabled.</p>
            </div>
            <Switch checked={enabled} disabled={!canManage} onCheckedChange={setEnabled} />
          </div>
          {canManage ? (
            <Button
              className="gap-2"
              disabled={!url.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ applicationId, url: url.trim(), enabled })}
            >
              <Save className="h-4 w-4" /> Save webhook
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent deliveries</CardTitle>
              <CardDescription>Only sanitized delivery metadata is retained.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => deliveriesQuery.refetch()}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(deliveriesQuery.data ?? []).map((delivery) => (
              <div key={delivery.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{delivery.status}</Badge>
                    <span className="text-sm font-medium">{delivery.reason}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Attempts: {delivery.attemptCount} · {new Date(delivery.createdAt).toLocaleString()}
                  </p>
                </div>
                {canManage && delivery.status === "dead" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={retryMutation.isPending}
                    onClick={() => retryMutation.mutate({ applicationId, deliveryId: delivery.id })}
                  >
                    <RotateCcw className="h-4 w-4" /> Retry
                  </Button>
                ) : null}
              </div>
            ))}
            {!deliveriesQuery.isLoading && (deliveriesQuery.data?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No revocation deliveries yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
