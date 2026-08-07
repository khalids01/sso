import { Navigate, createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBetterAuthSso } from "@/lib/better-auth-client";

export const Route = createFileRoute("/better-auth_/dashboard")({
  component: BetterAuthDashboard,
});

function BetterAuthDashboard() {
  const auth = useBetterAuthSso();

  if (auth.status === "unauthenticated") return <Navigate to="/better-auth" replace />;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-10 md:pt-16">
      <Badge className="mb-5">Better Auth session</Badge>
      <Card className="bg-card/80">
        <CardHeader><CardTitle>Authenticated through the Better Auth adapter</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p>{auth.user?.email ?? "Loading session…"}</p>
          <button
            className={buttonVariants()}
            disabled={auth.isPending}
            onClick={() => void auth.signOut({ returnTo: "/better-auth" })}
          >
            Sign out everywhere
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
