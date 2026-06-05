import { auth } from "./auth-instance.server";

export type AuthGetSessionResult = Awaited<
  ReturnType<typeof auth.api.getSession>
>;

export type AuthSessionData = NonNullable<AuthGetSessionResult>;

export type AuthUser = AuthSessionData["user"];

export async function getAuthSession(
  headers: Headers,
): Promise<AuthGetSessionResult> {
  return auth.api.getSession({ headers });
}
