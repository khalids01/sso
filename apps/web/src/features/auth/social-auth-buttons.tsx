import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/client";
import { getAuthCallbackURL } from "./auth-callback";

export type SocialAuthMethod = "google" | "facebook" | "linkedin" | "github";

const labels: Record<SocialAuthMethod, string> = {
  google: "Google",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
};

export function SocialAuthButtons({
  methods,
  requestSignUp = false,
}: {
  methods: SocialAuthMethod[];
  requestSignUp?: boolean;
}) {
  if (methods.length === 0) return null;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {methods.map((method) => (
        <Button
          key={method}
          type="button"
          variant="outline"
          onClick={async () => {
            const { data, error } = await client.auth.social.post({
              provider: method,
              callbackURL: getAuthCallbackURL(),
              requestSignUp,
            });
            if (error) {
              const message =
                typeof error.value === "object" &&
                error.value &&
                "message" in error.value
                  ? String(error.value.message)
                  : `${labels[method]} authentication failed`;
              toast.error(message);
              return;
            }
            if (data instanceof Response) return;
            if (data && "url" in data && typeof data.url === "string") {
              window.location.assign(data.url);
            }
          }}
        >
          Continue with {labels[method]}
        </Button>
      ))}
    </div>
  );
}
