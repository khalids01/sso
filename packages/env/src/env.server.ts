import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().int().positive().default(5001),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    REDIS_KEY_PREFIX: z.string().default("sso:"),
    BETTER_AUTH_SECRET: z.string().min(32),
    SOCIAL_PROVIDER_CREDENTIALS_KEY: z.string().min(32).optional(),
    BETTER_AUTH_URL: z.url(),
    SSO_ISSUER: z.url(),
    AUTH_SESSION_COOKIE_NAME: z.string().min(1).default("better-auth.session_token"),
    AUTH_COOKIE_DOMAIN: z.string().min(1).optional(),
    ENABLE_PASSWORD_AUTH: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    LINKEDIN_CLIENT_ID: z.string().optional(),
    LINKEDIN_CLIENT_SECRET: z.string().optional(),
    ENABLE_OAUTH_TOKEN_ISSUANCE: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    ENABLE_APPLICATION_REVOCATION_DELIVERY: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    ALLOW_LOCAL_APPLICATION_WEBHOOKS: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_WEBHOOK_SECRET: z.string().optional(),
    POLAR_SUCCESS_URL: z.string().url().optional(),
    POLAR_PRO_MONTHLY_ID: z.string().optional(),
    POLAR_PRO_YEARLY_ID: z.string().optional(),
    POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
    ENABLE_POLAR: z
      .string()
      .default("true")
      .transform((val) => val === "true"),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    EMAIL: z.email().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
  },
  runtimeEnv: {
    ...process.env,
  },
  emptyStringAsUndefined: true,
});

type PolarEnv = {
  POLAR_ACCESS_TOKEN: string;
  POLAR_WEBHOOK_SECRET: string;
  POLAR_SUCCESS_URL: string;
  POLAR_MODE: "sandbox" | "production";
};

export function getRequiredPolarEnv(): PolarEnv {
  if (!env.ENABLE_POLAR) {
    throw new Error("Polar is disabled. Set ENABLE_POLAR=true to use Polar.");
  }

  const missing = [
    ["POLAR_ACCESS_TOKEN", env.POLAR_ACCESS_TOKEN],
    ["POLAR_WEBHOOK_SECRET", env.POLAR_WEBHOOK_SECRET],
    ["POLAR_SUCCESS_URL", env.POLAR_SUCCESS_URL],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Polar is enabled but missing required env vars: ${missing.join(", ")}`,
    );
  }

  return {
    POLAR_ACCESS_TOKEN: env.POLAR_ACCESS_TOKEN!,
    POLAR_WEBHOOK_SECRET: env.POLAR_WEBHOOK_SECRET!,
    POLAR_SUCCESS_URL: env.POLAR_SUCCESS_URL!,
    POLAR_MODE: env.POLAR_MODE,
  };
}

if (env.ENABLE_POLAR) {
  getRequiredPolarEnv();
}

if (env.NODE_ENV === "production" && env.ALLOW_LOCAL_APPLICATION_WEBHOOKS) {
  throw new Error(
    "ALLOW_LOCAL_APPLICATION_WEBHOOKS cannot be enabled in production",
  );
}
