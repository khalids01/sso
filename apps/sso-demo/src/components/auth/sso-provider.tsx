import { createSsoClient } from "@skycanvasstudio/sso/client";
import { SsoProvider } from "@skycanvasstudio/sso/react";
import { useState, type ReactNode } from "react";
import type { DemoSession, DemoUser } from "@/lib/sso-types";

interface DemoSsoProviderProps {
  initialSession: DemoSession | null;
  children: ReactNode;
}

export function DemoSsoProvider({ initialSession, children }: DemoSsoProviderProps) {
  const [client] = useState(() => createSsoClient<DemoUser>());

  return (
    <SsoProvider client={client} initialSession={initialSession}>
      {children}
    </SsoProvider>
  );
}
