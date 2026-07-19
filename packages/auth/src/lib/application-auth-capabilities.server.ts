import { env } from "@env/server";

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
    configured: false,
  },
  {
    id: "facebook",
    label: "Facebook",
    configured: false,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    configured: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET),
  },
  {
    id: "github",
    label: "GitHub",
    configured: false,
  },
] as const;

export function getApplicationAuthCapabilities(
  configuredApplicationProviders: Iterable<string> = [],
): ApplicationAuthCapability[] {
  const configured = new Set(configuredApplicationProviders);
  return [
    {
      id: "magic_link",
      label: "Email magic link",
      available: Boolean(env.SMTP_HOST && env.EMAIL && env.EMAIL_PASSWORD),
      supportsSignUp: true,
      unavailableReason: "Email delivery is not configured on the SSO server",
    },
    {
      id: "password",
      label: "Email and password",
      available: env.ENABLE_PASSWORD_AUTH,
      supportsSignUp: true,
      unavailableReason: "Password authentication is disabled on the SSO server",
    },
    ...socialProviders.map((provider) => ({
      id: provider.id,
      label: provider.label,
      available: provider.configured || configured.has(provider.id),
      supportsSignUp: true,
      unavailableReason: `${provider.label} client ID and client secret are not configured`,
    })),
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
  configuredApplicationProviders: Iterable<string> = [],
) {
  return new Set(
    getApplicationAuthCapabilities(configuredApplicationProviders)
      .filter((capability) => capability.available)
      .map((capability) => capability.id),
  );
}
