import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { client } from "@/lib/client";
import { getAuthCallbackURL } from "./auth-callback";
import { useAuthMethodStore } from "./auth-method-store";
import { LastUsedBadge } from "./last-used-badge";

export type SocialAuthMethod = "google" | "facebook" | "linkedin" | "github";

const labels: Record<SocialAuthMethod, string> = {
  google: "Google",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  github: "GitHub",
};

function ProviderIcon({ provider }: { provider: SocialAuthMethod }) {
  if (provider === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          fill="#4285F4"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
        />
        <path
          fill="#FBBC05"
          d="M6.39 13.86A6 6 0 0 1 6.08 12c0-.65.11-1.28.31-1.86V7.52H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.48l3.35-2.62Z"
        />
        <path
          fill="#EA4335"
          d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.35 2.62C7.18 7.77 9.39 6.01 12 6.01Z"
        />
      </svg>
    );
  }
  if (provider === "github") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 fill-current"
      >
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 6.82a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    );
  }
  if (provider === "facebook") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          fill="#1877F2"
          d="M22 12A10 10 0 1 0 10.44 21.9v-7H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.9h-2.33v7A10 10 0 0 0 22 12Z"
        />
        <path
          fill="#fff"
          d="m15.9 14.9.44-2.9h-2.77v-1.88c0-.79.39-1.56 1.63-1.56h1.26V6.1s-1.15-.2-2.24-.2c-2.28 0-3.78 1.39-3.78 3.9V12H7.9v2.9h2.54v7a10.1 10.1 0 0 0 3.13 0v-7h2.33Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.04H3.54V8.98H7.1v11.47Z"
      />
    </svg>
  );
}

export function SocialAuthButtons({
  methods,
  requestSignUp = false,
  autoStartProvider,
}: {
  methods: SocialAuthMethod[];
  requestSignUp?: boolean;
  autoStartProvider?: SocialAuthMethod;
}) {
  const rememberMethod = useAuthMethodStore((state) => state.rememberMethod);
  const autoStarted = useRef(false);
  const startSocial = useCallback(async (method: SocialAuthMethod) => {
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
      rememberMethod(method);
      window.location.assign(data.url);
    }
  }, [rememberMethod, requestSignUp]);

  useEffect(() => {
    if (!autoStartProvider || !methods.includes(autoStartProvider) || autoStarted.current) return;
    autoStarted.current = true;
    void startSocial(autoStartProvider);
  }, [autoStartProvider, methods, startSocial]);

  if (methods.length === 0) return null;

  return (
    <div className="grid gap-3">
      {methods.map((method) => (
        <Button
          key={method}
          type="button"
          variant="outline"
          className="relative h-11 w-full justify-center rounded-lg bg-background font-medium shadow-xs transition-colors hover:bg-muted/60"
          onClick={() => void startSocial(method)}
        >
          <span className="flex items-center justify-center gap-2">
            <ProviderIcon provider={method} />
            <span>Continue with {labels[method]}</span>
          </span>
          <span className="absolute right-3">
            <LastUsedBadge method={method} />
          </span>
        </Button>
      ))}
    </div>
  );
}
