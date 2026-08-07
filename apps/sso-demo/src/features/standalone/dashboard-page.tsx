import { Navigate } from "@tanstack/react-router";
import { useSkyCanvas } from "@skycanvasstudio/sso/react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StandaloneDashboardPage() {
  const auth = useSkyCanvas();

  if (!auth.session) return <Navigate to="/standalone" replace />;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pt-10 md:pt-16">
      <Badge className="mb-5">Standalone session</Badge>
      <Card className="bg-card/80">
        <CardHeader><CardTitle>Authenticated without Better Auth</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <p>{auth.session.user.email}</p>
          <button
            className={buttonVariants()}
            onClick={() => void auth.logout({ returnTo: "/standalone" })}
          >
            Sign out everywhere
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
