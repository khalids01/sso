import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(e2eRoot, "../..");

dotenv.config({ path: path.join(repoRoot, "apps/server/.env"), quiet: true });
dotenv.config({ path: path.join(e2eRoot, ".env"), quiet: true });

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const enabledBooleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const commaSeparated = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );

const schema = z.object({
  E2E_TARGET: z.enum(["local", "staging"]).default("local"),
  E2E_WEB_ORIGIN: z.url().default("http://localhost:5002"),
  E2E_API_ORIGIN: z.url().default("http://localhost:5001"),
  E2E_DEMO_ORIGIN: z.url().default("http://localhost:5003"),
  E2E_CALLBACK_ORIGIN: z.url().default("http://127.0.0.1:5010"),
  E2E_CALLBACK_LISTEN_PORT: z.coerce.number().int().min(1).max(65_535).default(5010),
  SSO_ISSUER: z.url(),
  E2E_ACTOR_EMAIL: z.email().transform((value) => value.toLowerCase()),
  E2E_ACTOR_PASSWORD: z.string().min(6).max(30),
  E2E_ACTOR_ROLE: z.enum([
    "owner",
    "admin",
    "user",
    "platform.owner",
    "platform.admin",
    "platform.user",
  ]),
  E2E_ACTOR_NAME: z.string().min(2).default("E2E Actor"),
  E2E_MEMBER_EMAIL: z.email().transform((value) => value.toLowerCase()),
  E2E_MEMBER_NAME: z.string().min(2).default("E2E Member"),
  E2E_ALLOWED_ACTOR_EMAILS: commaSeparated,
  E2E_PROVISION_ACTOR: booleanString,
  E2E_CONFIRM_MUTATIONS: z.string(),
  E2E_ALLOWED_WEB_ORIGINS: commaSeparated,
  E2E_ALLOWED_API_ORIGINS: commaSeparated,
  E2E_ALLOWED_DEMO_ORIGINS: commaSeparated,
  E2E_ALLOWED_CALLBACK_ORIGINS: commaSeparated,
  E2E_KNOWN_PRODUCTION_ORIGINS: commaSeparated,
  E2E_DATABASE_URL: z.string().url().optional().or(z.literal("")),
  E2E_REDIS_URL: z.string().url().optional().or(z.literal("")),
  E2E_ALLOWED_DATABASE_HOSTS: commaSeparated,
  E2E_ALLOWED_REDIS_HOSTS: commaSeparated,
  E2E_RUN_ID: z.string().optional(),
  E2E_SLOW_MO: z.coerce.number().int().min(0).max(5_000).default(0),
  E2E_SHOW_CURSOR: enabledBooleanString,
});

const parsed = schema.parse(process.env);
const generatedRunId = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const runId = sanitizeRunId(parsed.E2E_RUN_ID || generatedRunId);
process.env.E2E_RUN_ID = runId;

if (parsed.E2E_TARGET === "staging") {
  if (parsed.E2E_DATABASE_URL) process.env.DATABASE_URL = parsed.E2E_DATABASE_URL;
  if (parsed.E2E_REDIS_URL) process.env.REDIS_URL = parsed.E2E_REDIS_URL;
}

export const e2eEnv = {
  ...parsed,
  runId,
  e2eRoot,
  repoRoot,
  runPrefix: `e2e-${runId}-`,
};

export type E2EEnvironment = typeof e2eEnv;

export function sanitizeRunId(value: string) {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  if (!sanitized || sanitized.length > 64) {
    throw new Error("E2E_RUN_ID must produce 1-64 lowercase letters, numbers, or hyphens");
  }
  return sanitized;
}
