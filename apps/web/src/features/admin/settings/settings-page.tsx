import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Save, Settings2 } from "lucide-react";
import { client } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import SignInForm from "@/features/auth/sign-in-form";
import SignUpForm from "@/features/auth/sign-up-form";
import type { ApplicationAuthPolicy } from "@/features/auth/application-auth-shell";

type Method = "magic_link" | "password" | "google" | "facebook" | "github" | "linkedin";
type Provider = Exclude<Method, "magic_link" | "password">;
type FormValues = {
  signInMethods: Method[];
  signUpMethods: Method[];
  registrationMode: "open" | "invite_only" | "closed";
  oauthConnections: Partial<Record<Provider, string | null>>;
};
type SettingsResponse = FormValues & {
  emailConfigured: boolean;
  passwordAvailable: boolean;
  oauthConnections: Partial<Record<Provider, { id: string; name: string }>>;
};
type OAuthOption = { id: string; name: string; provider: Provider; status: string };
const methods: { id: Method; label: string }[] = [
  { id: "magic_link", label: "Magic link" },
  { id: "password", label: "Email and password" },
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<"login" | "signup">("login");
  const settings = useQuery({
    queryKey: ["admin-platform-auth-settings"],
    queryFn: async () => {
      const { data, error } = await client.admin.settings["platform-auth"].get();
      if (error) throw error;
      return data as SettingsResponse;
    },
  });
  const options = useQuery({
    queryKey: ["admin-oauth-connections", "options"],
    queryFn: async () => {
      const { data, error } = await client.admin["oauth-connections"].options.get();
      if (error) throw error;
      return (data as { items: OAuthOption[] }).items;
    },
  });
  const { watch, reset, setValue, handleSubmit } = useForm<FormValues>({
    defaultValues: { signInMethods: [], signUpMethods: [], registrationMode: "open", oauthConnections: {} },
  });
  useEffect(() => {
    if (!settings.data) return;
    reset({
      signInMethods: settings.data.signInMethods,
      signUpMethods: settings.data.signUpMethods,
      registrationMode: settings.data.registrationMode,
      oauthConnections: Object.fromEntries(
        Object.entries(settings.data.oauthConnections).map(([key, value]) => [key, value?.id]),
      ),
    });
  }, [settings.data, reset]);
  const values = watch();
  const save = useMutation({
    mutationFn: async (value: FormValues) => {
      const { error } = await client.admin.settings["platform-auth"].patch(value);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Platform authentication settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-platform-auth-settings"] });
      queryClient.invalidateQueries({ queryKey: ["platform-auth-settings"] });
    },
    onError: () => toast.error("Could not save platform authentication settings"),
  });
  const toggle = (field: "signInMethods" | "signUpMethods", method: Method, checked: boolean) => {
    const next = checked ? [...new Set([...values[field], method])] : values[field].filter((item) => item !== method);
    setValue(field, next, { shouldDirty: true });
    if (field === "signInMethods" && !checked) {
      setValue("signUpMethods", values.signUpMethods.filter((item) => item !== method));
    }
  };
  const previewPolicy: ApplicationAuthPolicy = {
    signInMethods: values.signInMethods,
    signUpMethods: values.registrationMode === "closed" ? [] : values.signUpMethods,
    registrationMode: values.registrationMode,
  };

  return <form onSubmit={handleSubmit((value) => save.mutate(value))} className="space-y-6 p-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="text-muted-foreground">Control authentication for the platform admin and dashboard.</p></div>
      <Button type="submit" disabled={save.isPending}><Save />{save.isPending ? "Saving..." : "Save settings"}</Button>
    </div>
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5" />Platform Auth</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Label htmlFor="registration-mode">New registrations</Label>
              <Select
                value={values.registrationMode}
                onValueChange={(value) => {
                  if (value) setValue("registrationMode", value as FormValues["registrationMode"], { shouldDirty: true });
                }}
              >
                <SelectTrigger id="registration-mode" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="invite_only">Invite only</SelectItem>
                  <SelectItem value="closed">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {methods.map(({ id, label }) => {
              const social = !["magic_link", "password"].includes(id);
              const unavailable = id === "password" && !settings.data?.passwordAvailable;
              const providerOptions = (options.data ?? []).filter((option) => option.provider === id);
              return <div key={id} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between"><span className="font-medium">{label}</span>{unavailable ? <span className="text-xs text-muted-foreground">Disabled by server env</span> : null}</div>
                <div className="flex gap-6 text-sm">
                  <label className="flex items-center gap-2"><Switch disabled={unavailable} checked={values.signInMethods.includes(id)} onCheckedChange={(checked) => toggle("signInMethods", id, checked)} />Sign in</label>
                  <label className="flex items-center gap-2"><Switch disabled={unavailable || !values.signInMethods.includes(id)} checked={values.signUpMethods.includes(id)} onCheckedChange={(checked) => toggle("signUpMethods", id, checked)} />Sign up</label>
                </div>
                {social && (values.signInMethods.includes(id) || values.signUpMethods.includes(id)) ? <Select
                  value={values.oauthConnections[id as Provider] ?? "__none"}
                  onValueChange={(value) => setValue(`oauthConnections.${id as Provider}`, !value || value === "__none" ? null : value, { shouldDirty: true })}
                >
                  <SelectTrigger className="mt-3 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select OAuth connection</SelectItem>
                    {providerOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}
                  </SelectContent>
                </Select> : null}
              </div>;
            })}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Mail className="size-5" />Platform Email</CardTitle></CardHeader>
          <CardContent><Label htmlFor="email-provider">Email provider</Label><Select value="server-env" disabled>
            <SelectTrigger id="email-provider" className="mt-2 w-full bg-muted"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="server-env">From Server Env</SelectItem></SelectContent>
          </Select>
            <p className="mt-2 text-sm text-muted-foreground">{settings.data?.emailConfigured ? "Server email credentials are configured." : "Server email credentials are not configured."}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit"><CardHeader><CardTitle>Authentication form preview</CardTitle>
        <div className="flex gap-2"><Button type="button" variant={preview === "login" ? "default" : "outline"} onClick={() => setPreview("login")}>Login</Button><Button type="button" variant={preview === "signup" ? "default" : "outline"} onClick={() => setPreview("signup")}>Signup</Button></div>
      </CardHeader><CardContent><div inert="" className="max-h-[680px] overflow-y-auto rounded-xl border bg-background">{preview === "login" ? <SignInForm applicationPolicy={previewPolicy} /> : <SignUpForm applicationPolicy={previewPolicy} />}</div></CardContent></Card>
    </div>
  </form>;
}
