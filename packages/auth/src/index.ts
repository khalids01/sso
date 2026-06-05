export { auth, type Auth } from "./auth-instance";
export { authOptions, type AuthOptions } from "./auth-options";

import { getAuthSession, toClientSession } from "./session";

export { getAuthSession, toClientSession };

export type {
  AuthClientSession,
  AuthGetSessionResult,
  AuthSessionData,
  AuthSessionRecord,
  AuthUser,
  ClientSession,
  ClientSessionResult,
  ClientSessionUser,
} from "./session";
