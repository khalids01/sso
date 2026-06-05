import type { Permission, RoleSlug, SessionRoleSummary } from "@rbac";

export type AuthClientSessionUser = {
  id: string;
  name: string;
  email: string;
  banned: boolean;
  banReason: string | null;
  archived: boolean;
  onboardingComplete: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  token: string;
};

export type AuthClientSession = {
  user: AuthClientSessionUser;
  session: AuthSessionRecord;
  permissions: Permission[];
  roles: SessionRoleSummary[];
  primaryRoleSlug: RoleSlug;
};

export type ClientSessionUser = Pick<
  AuthClientSessionUser,
  "id" | "name" | "email" | "onboardingComplete" | "plan" | "subscriptionStatus"
>;

export type ClientSession = {
  user: ClientSessionUser;
  permissions: Permission[];
  roles: SessionRoleSummary[];
  primaryRoleSlug: RoleSlug;
};

export type ClientSessionResult = ClientSession | null;
