import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { getAuthCallbackURL } from "./auth-callback";

export type SocialAuthMethod = "google" | "facebook" | "linkedin" | "github";

const labels: Record<SocialAuthMethod, string> = {
  google: "Google",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
};

export function SocialAuthButtons({ methods }: { methods: SocialAuthMethod[] }) {
  if (methods.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {methods.map((method) => (
        <Button
          key={method}
          type="button"
          variant="outline"
          onClick={async () => {
            const { error } = await authClient.signIn.social({
              provider: method,
              callbackURL: getAuthCallbackURL(),
            });
            if (error) {
              toast.error(`${labels[method]} authentication failed`);
            }
          }}
        >
          Continue with {labels[method]}
        </Button>
      ))}
    </div>
  );
}
