const DEFAULT_APP_URL = "http://localhost:5003";
const DEFAULT_SSO_URL = "http://localhost:5001";

export interface DemoSsoConfig {
  appUrl: string;
  ssoUrl: string;
  clientId?: string;
  sessionSecret: string;
}

export function getDemoSsoConfig(): DemoSsoConfig {
  const appUrl = toOrigin(
    process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? DEFAULT_APP_URL,
    "APP_URL",
  );
  const ssoUrl = toOrigin(process.env.SSO_URL ?? DEFAULT_SSO_URL, "SSO_URL");
  const sessionSecret = process.env.SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }

  return {
    appUrl,
    ssoUrl,
    sessionSecret,
    ...(process.env.SSO_CLIENT_ID ? { clientId: process.env.SSO_CLIENT_ID } : {}),
  };
}

function toOrigin(value: string, name: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}
