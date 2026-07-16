import { e2eEnv } from "./environment";

const MUTATION_CONFIRMATION = "I_UNDERSTAND_E2E_MUTATES_DATA";

function normalizedOrigin(value: string) {
  return new URL(value).origin;
}

function requireExact(value: string, allowed: string[], label: string) {
  const normalized = normalizedOrigin(value);
  const normalizedAllowed = allowed.map(normalizedOrigin);
  if (!normalizedAllowed.includes(normalized)) {
    throw new Error(`${label} ${normalized} is not explicitly allowlisted`);
  }
}

function refuseProduction(value: string) {
  const origin = normalizedOrigin(value);
  if (e2eEnv.E2E_KNOWN_PRODUCTION_ORIGINS.map(normalizedOrigin).includes(origin)) {
    throw new Error(`Refusing E2E execution against known production origin ${origin}`);
  }
}

function requireLoopback(value: string, label: string) {
  const hostname = new URL(value).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(`${label} must use a loopback host in local mode`);
  }
}

function requireServiceHost(url: string | undefined, allowed: string[], label: string) {
  if (!url) throw new Error(`${label} is required for staging E2E`);
  const hostname = new URL(url).hostname.toLowerCase();
  if (!allowed.map((item) => item.toLowerCase()).includes(hostname)) {
    throw new Error(`${label} host ${hostname} is not explicitly allowlisted`);
  }
}

export function assertE2ESafety() {
  if (e2eEnv.E2E_CONFIRM_MUTATIONS !== MUTATION_CONFIRMATION) {
    throw new Error(`Set E2E_CONFIRM_MUTATIONS=${MUTATION_CONFIRMATION} to run mutating E2E tests`);
  }

  const allowedEmails = new Set(
    e2eEnv.E2E_ALLOWED_ACTOR_EMAILS.map((email) => email.toLowerCase()),
  );
  for (const email of [e2eEnv.E2E_ACTOR_EMAIL, e2eEnv.E2E_MEMBER_EMAIL]) {
    if (!allowedEmails.has(email)) {
      throw new Error(`E2E identity ${email} is not in E2E_ALLOWED_ACTOR_EMAILS`);
    }
  }

  refuseProduction(e2eEnv.E2E_WEB_ORIGIN);
  refuseProduction(e2eEnv.E2E_API_ORIGIN);
  refuseProduction(e2eEnv.E2E_CALLBACK_ORIGIN);

  if (e2eEnv.E2E_TARGET === "local") {
    requireLoopback(e2eEnv.E2E_WEB_ORIGIN, "E2E_WEB_ORIGIN");
    requireLoopback(e2eEnv.E2E_API_ORIGIN, "E2E_API_ORIGIN");
    requireLoopback(e2eEnv.E2E_CALLBACK_ORIGIN, "E2E_CALLBACK_ORIGIN");
    return;
  }

  requireExact(e2eEnv.E2E_WEB_ORIGIN, e2eEnv.E2E_ALLOWED_WEB_ORIGINS, "Web origin");
  requireExact(e2eEnv.E2E_API_ORIGIN, e2eEnv.E2E_ALLOWED_API_ORIGINS, "API origin");
  requireExact(
    e2eEnv.E2E_CALLBACK_ORIGIN,
    e2eEnv.E2E_ALLOWED_CALLBACK_ORIGINS,
    "Callback origin",
  );
  requireServiceHost(
    e2eEnv.E2E_DATABASE_URL || undefined,
    e2eEnv.E2E_ALLOWED_DATABASE_HOSTS,
    "E2E_DATABASE_URL",
  );
  requireServiceHost(
    e2eEnv.E2E_REDIS_URL || undefined,
    e2eEnv.E2E_ALLOWED_REDIS_HOSTS,
    "E2E_REDIS_URL",
  );
}

export async function assertApprovedRedirects() {
  for (const origin of [e2eEnv.E2E_WEB_ORIGIN, e2eEnv.E2E_API_ORIGIN]) {
    const response = await fetch(origin, { redirect: "manual" });
    const location = response.headers.get("location");
    if (!location) continue;
    const redirected = new URL(location, origin).origin;
    refuseProduction(redirected);
    if (redirected !== normalizedOrigin(origin)) {
      throw new Error(`${origin} redirects outside its approved origin to ${redirected}`);
    }
  }
}
