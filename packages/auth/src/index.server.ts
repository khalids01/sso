export { auth, type Auth } from "./auth-instance.server";
export { authOptions, type AuthOptions } from "./auth-options.server";
export {
  createS256Challenge,
  hashOAuthToken,
  isValidPkceVerifier,
  securelyMatchesChallenge,
} from "./lib/oauth-token.server";

export { getAuthSession } from "./session.server";
export { toClientSession } from "./session.client";
export {
  getPolarCustomerState,
} from "./lib/payments.server";
export { isMissingPolarCustomerError } from "./lib/polar-error";

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
export {
  getApplicationAuthCapabilities,
  getAvailableApplicationAuthMethodIds,
  type ApplicationAuthCapability,
} from "./lib/application-auth-capabilities.server";
