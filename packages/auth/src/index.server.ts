export { auth, type Auth } from "./auth-instance.server";
export { authOptions, type AuthOptions } from "./auth-options.server";

export { getAuthSession } from "./session.server";
export { toClientSession } from "./session.client";

export type {
  AuthGetSessionResult,
  AuthSessionData,
  AuthUser,
} from "./session.server";

export type {
  AuthClientSession,
  AuthClientSessionUser,
  AuthSessionRecord,
  ClientSession,
  ClientSessionResult,
  ClientSessionUser,
} from "./session";

export { PLANS, type Plan, type PlanSlug } from "./plans.server";
