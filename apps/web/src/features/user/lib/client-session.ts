export type UserRole = "OWNER" | "ADMIN" | "USER" | string;

export type ClientSessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingComplete: boolean;
  plan: string | null;
  subscriptionStatus: string | null;
};

export type ClientSession = {
  user: ClientSessionUser;
  permissions: string[];
} | null;
