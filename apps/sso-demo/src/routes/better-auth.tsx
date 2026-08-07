import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBetterAuthSso } from "@/lib/better-auth-client";

export const Route = createFileRoute("/better-auth")({
  component: BetterAuthSignInPage,
});

function BetterAuthSignInPage() {
  const auth = useBetterAuthSso();

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-10 md:pt-16">
      <Badge className="mb-5">Better Auth adapter</Badge>
      <Card className="bg-card/80">
        <CardHeader>
          <CardTitle>Sign in through Better Auth</CardTitle>
          <CardDescription>
            Better Auth owns the application session; SkyCanvas is its OAuth identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            className={buttonVariants()}
            disabled={auth.isPending}
            onClick={() => void auth.signIn("/better-auth/dashboard")}
          >
            Continue with Better Auth SSO
          </button>
        </CardContent>
      </Card>
    </main>
  );
}
