import { SignIn } from "@skycanvasstudio/sso/react";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";

export function StandaloneSignInPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-10 md:pt-16">
      <Badge className="mb-5">Clerk-like standalone</Badge>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">
        This form is rendered by the npm package. Password authentication stays
        inside the client application.
      </p>
      <SignIn
        returnTo="/standalone/dashboard"
        onSuccess={() => void navigate({ to: "/standalone/dashboard" })}
      />
    </main>
  );
}
