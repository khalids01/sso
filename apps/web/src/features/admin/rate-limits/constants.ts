export const GROUPS = [
  {
    key: "public",
    title: "Public API",
    description: "Anonymous requests such as public pages and unauthenticated endpoints.",
  },
  {
    key: "auth",
    title: "Auth API",
    description: "Login, signup, email checks, and Better Auth endpoints.",
  },
  {
    key: "protected",
    title: "Protected API",
    description: "Signed-in non-admin traffic such as user actions and account features.",
  },
  {
    key: "admin",
    title: "Admin API",
    description: "Dashboard and admin-only endpoints.",
  },
  {
    key: "special",
    title: "Special Endpoints",
    description: "Webhooks and websocket-related traffic with separate operational needs.",
  },
] as const;

export type GroupKey = (typeof GROUPS)[number]["key"];
