import { Link, createFileRoute, getRouteApi } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  client_id: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: HomePage,
});

const rootRoute = getRouteApi("__root__");

const errorMessages: Record<string, string> = {
  client_not_configured: "Set SSO_DEMO_CLIENT_ID or provide a client_id query parameter.",
  missing_authorization_context: "The login context is missing. Please start again.",
  invalid_authorization_context: "The login context could not be verified. Please start again.",
  authorization_context_expired: "The login attempt expired. Please start again.",
  state_mismatch: "The callback state did not match, so the login was rejected.",
  authorization_denied: "Authorization was cancelled or denied.",
  missing_authorization_code: "The SSO callback did not include an authorization code.",
  callback_failed: "The authorization code or returned tokens could not be verified.",
};

function HomePage() {
  const { client_id: clientId, error } = Route.useSearch();
  const { session } = rootRoute.useLoaderData();
  const loginHref = `/auth/start${clientId ? `?client_id=${encodeURIComponent(clientId)}` : ""}`;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-12 px-5 pt-10 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:pt-20">
      <section className="flex flex-col justify-center">
        <Badge className="mb-6 w-fit"><CheckCircle2 className="mr-1.5 size-3.5 text-primary" />Real OAuth + PKCE flow</Badge>
        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-6xl">
          A small app that tests the <span className="text-primary">whole SSO contract.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
          Sign in through the centralized SSO, return through the registered callback, and create a verified local application session.
        </p>
        {error && <div role="alert" className="mt-6 max-w-xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessages[error] ?? "Login could not be completed."}</div>}
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={loginHref} className={cn(buttonVariants({ size: "lg" }), "shadow-lg shadow-primary/20")}>
            Continue with SSO <ArrowRight className="size-4" />
          </a>
          {session ? <Link to="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>Open dashboard</Link> : null}
        </div>
      </section>

      <Card className="overflow-hidden bg-card/80 backdrop-blur-xl">
        <CardHeader className="border-b bg-muted/50">
          <div className="mb-3 grid size-12 place-items-center rounded-xl border bg-background"><ShieldCheck className="size-6 text-primary" /></div>
          <CardTitle>Reference relying party</CardTitle>
          <CardDescription>Built to be readable, secure by default, and deterministic under Playwright.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <Feature icon={KeyRound} title="Authorization code + PKCE" text="A fresh verifier, challenge, state, and nonce protect every login." />
          <Feature icon={ShieldCheck} title="JWKS token verification" text="Issuer, audience, signature, subject, and nonce are checked server-side." />
          <Feature icon={LockKeyhole} title="HttpOnly local session" text="OAuth tokens never enter browser storage or client-rendered data." />
        </CardContent>
      </Card>
    </main>
  );
}

function Feature({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="flex gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary"><Icon className="size-4 text-primary" /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div>;
}
