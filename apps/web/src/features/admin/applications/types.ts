export type ApplicationStatus = "active" | "disabled" | "archived";

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
