export type InvitationListItem = {
  email: string;
  invitationCount: number;
  lastExpiresAt: string | null;
  status: "accepted" | "pending";
  acceptedUserName: string | null;
};

export type UsersListResponse = {
  users: AdminUser[];
  total: number;
  pages: number;
};

export type InvitationsListResponse = {
  items: InvitationListItem[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};
import type { UserAuthMethod } from "../components/auth-method-badges";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  banned: boolean;
  banReason: string | null;
  archived: boolean;
  onboardingComplete: boolean;
  plan: string;
  subscriptionStatus: string | null;
  role: { slug: string; name: string };
  authMethods: UserAuthMethod[];
};
