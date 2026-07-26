import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryKeys } from "@/constants/query-keys";
import { client } from "@/lib/client";
import type { EmailConnection } from "./types";

type FormState = {
  name: string; provider: "resend" | "nodemailer"; fromName: string;
  fromAddress: string; replyToAddress: string; secret: string;
  smtpHost: string; smtpPort: string; smtpSecure: boolean; smtpUsername: string;
};
const defaults: FormState = {
  name: "", provider: "resend", fromName: "SSO", fromAddress: "",
  replyToAddress: "", secret: "", smtpHost: "", smtpPort: "587",
  smtpSecure: false, smtpUsername: "",
};

export function EmailManagerPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"current" | "archived">("current");
  const [form, setForm] = useState(defaults);
  const query = useQuery({
    queryKey: queryKeys.admin.emailConnections.list(filter),
    queryFn: async () => {
      const { data, error } = await client.admin["email-connections"].get({
        query: { page: 1, limit: 100, filter },
      });
      if (error) throw error;
      return data as { items: EmailConnection[] };
    },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.emailConnections.all() });
  const create = useMutation({
    mutationFn: async () => {
      const common = {
        name: form.name, provider: form.provider, fromName: form.fromName,
        fromAddress: form.fromAddress, replyToAddress: form.replyToAddress || null,
      };
      const payload = form.provider === "resend"
        ? { ...common, provider: "resend" as const, apiKey: form.secret }
        : {
            ...common, provider: "nodemailer" as const, smtpHost: form.smtpHost,
            smtpPort: Number(form.smtpPort), smtpSecure: form.smtpSecure,
            smtpUsername: form.smtpUsername || undefined, smtpPassword: form.secret,
          };
      const { error } = await client.admin["email-connections"].post(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email connection created"); setOpen(false); setForm(defaults); invalidate();
    },
    onError: () => toast.error("Failed to create email connection"),
  });
  const lifecycle = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "archive" | "restore" }) => {
      const endpoint = client.admin["email-connections"]({ id });
      const result = action === "archive" ? await endpoint.archive.post() : await endpoint.restore.post();
      if (result.error) throw result.error;
    },
    onSuccess: () => { toast.success("Email connection updated"); invalidate(); },
    onError: () => toast.error("Failed to update email connection"),
  });
  const testConnection = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: string }) => {
      const { error } = await client.admin["email-connections"]({ id }).test.post({ to });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Test email sent"),
    onError: () => toast.error("Test email failed"),
  });

  const field = (key: keyof FormState, label: string, type = "text") => (
    <div className="grid gap-2">
      <Label htmlFor={`email-${key}`}>{label}</Label>
      <Input id={`email-${key}`} type={type} value={String(form[key])}
        onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))} />
    </div>
  );

  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Email Manager</h1>
        <p className="text-sm text-muted-foreground">Reusable Resend and SMTP connections for application authentication mail.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setFilter(filter === "current" ? "archived" : "current")}>
          {filter === "current" ? "View archived" : "View current"}
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus />Add connection</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add email connection</DialogTitle>
              <DialogDescription>Credentials are encrypted and never returned by the API.</DialogDescription>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
              {field("name", "Connection name")}
              <div className="grid gap-2"><Label>Provider</Label>
                <Select value={form.provider} onValueChange={(provider) => setForm((value) => ({ ...value, provider: provider as FormState["provider"] }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="resend">Resend</SelectItem><SelectItem value="nodemailer">Nodemailer / SMTP</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">{field("fromName", "From name")}{field("fromAddress", "From address", "email")}</div>
              {field("replyToAddress", "Reply-to address (optional)", "email")}
              {form.provider === "nodemailer" ? <>
                <div className="grid gap-4 sm:grid-cols-2">{field("smtpHost", "SMTP host")}{field("smtpPort", "SMTP port", "number")}</div>
                {field("smtpUsername", "SMTP username (optional)")}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.smtpSecure}
                  onChange={(event) => setForm((value) => ({ ...value, smtpSecure: event.target.checked }))} />Use implicit TLS</label>
              </> : null}
              {field("secret", form.provider === "resend" ? "Resend API key" : "SMTP password", "password")}
              <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create connection"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    {query.isLoading ? <p className="text-sm text-muted-foreground">Loading connections...</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(query.data?.items ?? []).map((connection) => <Card key={connection.id}>
        <CardHeader><div className="flex items-center justify-between"><div className="flex items-center gap-2">
          <Mail className="size-5" /><CardTitle>{connection.name}</CardTitle></div>
          <span className="rounded-full border px-2 py-0.5 text-xs">{connection.status}</span>
        </div></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="text-muted-foreground">Provider:</span> {connection.provider}</p>
          <p><span className="text-muted-foreground">From:</span> {connection.fromName} &lt;{connection.fromAddress}&gt;</p>
          <p><span className="text-muted-foreground">Applications:</span> {connection.applicationCount}</p>
          <p><span className="text-muted-foreground">Credential version:</span> {connection.credentialVersion}</p>
          <div className="flex gap-2">
            {connection.status === "active" ? (
              <Button size="sm" variant="outline" disabled={testConnection.isPending}
                onClick={() => {
                  const to = window.prompt("Send test email to:");
                  if (to) testConnection.mutate({ id: connection.id, to });
                }}>Send test</Button>
            ) : null}
            <Button size="sm" variant="outline" disabled={lifecycle.isPending}
              onClick={() => lifecycle.mutate({ id: connection.id, action: filter === "archived" ? "restore" : "archive" })}>
              {filter === "archived" ? "Restore" : "Archive"}
            </Button>
          </div>
        </CardContent>
      </Card>)}
    </div>
  </div>;
}
