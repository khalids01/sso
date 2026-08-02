import { SsoSignInButton, useSso } from "@skycanvasstudio/sso/react";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DASHBOARD_RETURN_TO = "/dashboard?connected=true";

interface DemoSignInButtonProps {
  clientId?: string;
}

export function DemoSignInButton({ clientId }: DemoSignInButtonProps) {
  const sso = useSso();

  const signIn = () => {
    if (!clientId) {
      sso.login({ returnTo: DASHBOARD_RETURN_TO });
      return;
    }

    // The query override is only used by E2E, which provisions a client at runtime.
    const params = new URLSearchParams({
      returnTo: DASHBOARD_RETURN_TO,
      client_id: clientId,
    });
    window.location.assign(`/auth/login?${params}`);
  };

  return (
    <SsoSignInButton
      onSignIn={signIn}
      className={cn(
        buttonVariants({ size: "lg" }),
        "shadow-lg shadow-primary/20",
      )}
    >
      Continue with SSO
      <ArrowRight className="size-4" />
    </SsoSignInButton>
  );
}
