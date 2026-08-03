import { createSsoClient } from "@skycanvasstudio/sso/client";
import { SsoProvider } from "@skycanvasstudio/sso/react";
import { useState, type ReactNode } from "react";
import type { DemoUser } from "@/lib/sso-types";

interface DemoSsoProviderProps {
  children: ReactNode;
}

export function DemoSsoProvider({ children }: DemoSsoProviderProps) {
  const [client] = useState(() => createSsoClient<DemoUser>());

  return (
    <SsoProvider client={client}>
      {children}
    </SsoProvider>
  );
}
