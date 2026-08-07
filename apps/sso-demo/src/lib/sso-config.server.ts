export interface DemoSsoConfig {
  appUrl: string;
  ssoUrl: string;
  clientId: string;
  betterAuthClientId: string;
  sessionSecret: string;
}

export function getDemoSsoConfig(): DemoSsoConfig {
  const appUrl = toOrigin(required("APP_URL"), "APP_URL");
  const ssoUrl = toOrigin(required("SSO_URL"), "SSO_URL");
  const clientId = required("SSO_CLIENT_ID");
  const betterAuthClientId = required("BETTER_AUTH_SSO_CLIENT_ID");
  const sessionSecret = required("SESSION_SECRET");

  if (!sessionSecret || sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }

  return {
    appUrl,
    ssoUrl,
    sessionSecret,
    clientId,
    betterAuthClientId,
  };
}

function required(name: "APP_URL" | "SSO_URL" | "SSO_CLIENT_ID" | "BETTER_AUTH_SSO_CLIENT_ID" | "SESSION_SECRET") {
  const value = process.env[name];
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

function toOrigin(value: string, name: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }
}
