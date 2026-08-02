import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useSso } from "@skycanvasstudio/sso/react";
import { Check, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { DemoUser } from "@/lib/sso-types";

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({ connected: z.coerce.boolean().optional() }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = useSso<DemoUser>();

  if (!session) {
    return (
      <Navigate
        to="/"
        search={{ error: undefined, client_id: undefined }}
        replace
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pt-10 md:px-8 md:pt-16">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Badge className="mb-4 border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Check className="mr-1.5 size-3.5" />
            Verified session
          </Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            Welcome, {session.user.name}
          </h1>
          <p className="mt-3 text-muted-foreground">
            The library exchanged the authorization code, verified both tokens,
            and created this application session.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Metric
          icon={Fingerprint}
          label="Pairwise subject"
          value={`${session.user.id.slice(0, 14)}…`}
        />
        <Metric icon={KeyRound} label="Scope" value={session.user.scope} />
        <Metric
          icon={ShieldCheck}
          label="Authorization version"
          value={String(session.user.authorizationVersion)}
        />
      </div>

      <Card className="mt-5 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Verified application session</CardTitle>
          <CardDescription>
            Safe token metadata retained by this relying party after signature
            and binding checks.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-x-10 gap-y-5 pt-6 md:grid-cols-2">
          <Claim label="Client ID" value={session.user.clientId} />
          <Claim label="Application ID" value={session.user.applicationId} />
          <Claim label="Membership ID" value={session.user.membershipId} />
          <Claim label="Audience" value={session.user.audience} />
          <Claim label="Issuer" value={session.user.issuer} />
          <Claim
            label="Expires"
            value={new Date(session.expiresAt).toLocaleString()}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <Card className="bg-card/80">
      <CardContent className="flex items-center gap-4 pt-6">
        <span className="grid size-11 place-items-center rounded-xl bg-secondary">
          <Icon className="size-5 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate font-mono text-sm font-semibold">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Claim({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 break-all font-mono text-sm">{value}</dd>
    </div>
  );
}
