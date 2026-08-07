import { env } from "./env";

export interface DemoSsoConfig {
  appUrl: string;
  ssoUrl: string;
  clientId: string;
  betterAuthClientId: string;
  sessionSecret: string;
}

export function getDemoSsoConfig(): DemoSsoConfig {
  console.log(env)
  const appUrl = toOrigin(required(env.APP_URL, "APP_URL"), "APP_URL");
  const ssoUrl = toOrigin(required(env.SSO_URL, "SSO_URL"), "SSO_URL");
  const clientId = required(env.SSO_CLIENT_ID, "SSO_CLIENT_ID");
  const betterAuthClientId = required(
    env.BETTER_AUTH_SSO_CLIENT_ID,
    "BETTER_AUTH_SSO_CLIENT_ID",
  );
  const sessionSecret = required(env.SESSION_SECRET, "SESSION_SECRET");

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

function required(value: string | undefined, name: string): string {
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
