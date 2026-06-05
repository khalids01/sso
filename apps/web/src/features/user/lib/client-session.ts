import type {
  Permission,
  SessionRoleSummary,
  RoleSlug,
} from "@rbac";

export type SessionRole = SessionRoleSummary;

export type ClientSessionUser = {
  id: string;
  name: string;
  email: string;
  onboardingComplete: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
};

export type ClientSession = {
  user: ClientSessionUser;
  permissions: Permission[];
  roles: SessionRoleSummary[];
  primaryRoleSlug: RoleSlug;
} | null;
