import { env } from "@sso/env/server";

export type ApplicationAuthCapability = {
  id: string;
  label: string;
  available: boolean;
  supportsSignUp: boolean;
  unavailableReason: string;
};

const socialProviders = [
  {
    id: "google",
    label: "Google",
  },
  {
    id: "facebook",
    label: "Facebook",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
  },
  {
    id: "github",
    label: "GitHub",
  },
] as const;

type ApplicationProviderConnection = {
  provider: string;
  name: string;
  status: string;
};

export function getApplicationAuthCapabilities(
  configuredApplicationProviders: Iterable<
    string | ApplicationProviderConnection
  > = [],
): ApplicationAuthCapability[] {
  const connections = new Map<string, ApplicationProviderConnection>();
  for (const item of configuredApplicationProviders) {
    const connection =
      typeof item === "string"
        ? { provider: item, name: item, status: "active" }
        : item;
    connections.set(connection.provider, connection);
  }
  return [
    {
      id: "magic_link",
      label: "Email magic link",
      available: true,
      supportsSignUp: true,
      unavailableReason:
        "Magic-link authentication requires an active application email connection",
    },
    {
      id: "password",
      label: "Email and password",
      available: env.ENABLE_PASSWORD_AUTH,
      supportsSignUp: true,
      unavailableReason:
        "Password authentication requires ENABLE_PASSWORD_AUTH=true on the SSO server",
    },
    ...socialProviders.map((provider) => {
      const connection = connections.get(provider.id);
      const available = connection?.status === "active";
      return {
        id: provider.id,
        label: provider.label,
        available,
        supportsSignUp: true,
        unavailableReason: !connection
          ? `No ${provider.label} OAuth connection is assigned to this application`
          : `The selected ${provider.label} connection "${connection.name}" is ${connection.status}`,
      };
    }),
    {
      id: "instagram",
      label: "Instagram",
      available: false,
      supportsSignUp: false,
      unavailableReason: "Instagram provider integration is not installed",
    },
  ];
}

export function getAvailableApplicationAuthMethodIds(
  configuredApplicationProviders: Iterable<
    string | ApplicationProviderConnection
  > = [],
) {
  return new Set(
    getApplicationAuthCapabilities(configuredApplicationProviders)
      .filter((capability) => capability.available)
      .map((capability) => capability.id),
  );
}
