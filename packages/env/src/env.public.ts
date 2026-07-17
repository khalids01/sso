import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  server: {
    AUTH_SESSION_COOKIE_NAME: z
      .string()
      .min(1)
      .default("better-auth.session_token"),
  },
  client: {
    VITE_SERVER_URL: z.url(),
    VITE_ENABLE_PASSWORD_AUTH: z
      .string()
      .default("false")
      .transform((value) => value === "true"),
    VITE_ENABLE_POLAR: z
      .string()
      .default("true")
      .transform((value) => value === "true"),
  },
  runtimeEnv: {
    ...(process as any).env,
    ...(import.meta as any).env,
  },
  emptyStringAsUndefined: true,
});
