export type ApplicationStatus = "active" | "disabled" | "archived";
export type ApplicationMemberStatus = "active" | "suspended" | "revoked";
export type ApplicationAuthMethod =
  | "magic_link"
  | "password"
  | "google"
  | "facebook"
  | "linkedin"
  | "github";
export type ApplicationSignupMethod = Exclude<ApplicationAuthMethod, "password">;
export type ApplicationRegistrationMode = "closed" | "invite_only" | "open";
export type ApplicationAuthCapability = {
  id: string;
  label: string;
  available: boolean;
  supportsSignUp: boolean;
  unavailableReason: string;
};

export type AdminApplication = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ApplicationStatus;
  logoUrl: string | null;
  homepageUrl: string | null;
  signInMethods: ApplicationAuthMethod[];
  signUpMethods: ApplicationSignupMethod[];
  registrationMode: ApplicationRegistrationMode;
  authCapabilities: ApplicationAuthCapability[];
  clientCount: number;
  memberCount: number;
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
  authorizationVersion: number;
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

export type ApplicationRevocationEndpoint = {
  id: string;
  applicationId: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationRevocationDelivery = {
  id: string;
  eventType: string;
  reason: string;
  status: string;
  attemptCount: number;
  nextAttemptAt: string;
  deliveredAt: string | null;
  lastHttpStatus: number | null;
  lastErrorCode: string | null;
  createdAt: string;
};

export type ApplicationMembersResponse = {
  items: ApplicationMember[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};
