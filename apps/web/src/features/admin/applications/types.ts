export type ApplicationStatus = "active" | "disabled" | "archived";
export type ApplicationMemberStatus = "active" | "suspended" | "revoked";

export type AdminApplication = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ApplicationStatus;
  logoUrl: string | null;
  homepageUrl: string | null;
  clientCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationsListResponse = {
  items: AdminApplication[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};

export type ApplicationClient = {
  id: string;
  applicationId: string;
  clientId: string;
  name: string;
  clientType: string;
  status: ApplicationStatus;
  redirectUris: string[];
  allowedOrigins: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApplicationClientsResponse = {
  items: ApplicationClient[];
};

export type ApplicationMember = {
  id: string;
  applicationId: string;
  userId: string;
  status: ApplicationMemberStatus;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    archived: boolean;
    banned: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type ApplicationMembersResponse = {
  items: ApplicationMember[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};
