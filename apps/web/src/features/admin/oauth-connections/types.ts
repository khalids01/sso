export type OAuthProviderId = "google" | "github" | "facebook" | "linkedin";
export type OAuthConnectionStatus = "active" | "disabled" | "archived";

export type OAuthConnection = {
  id: string;
  name: string;
  provider: OAuthProviderId;
  clientId: string;
  credentialVersion: number;
  status: OAuthConnectionStatus;
  applicationCount: number;
  accountCount: number;
  isUsedByPlatform: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OAuthConnectionsResponse = {
  items: OAuthConnection[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};

export type OAuthConnectionOption = Pick<
  OAuthConnection,
  "id" | "name" | "provider" | "status"
>;

export type OAuthConnectionInput = {
  name: string;
  provider: OAuthProviderId;
  clientId: string;
  clientSecret: string;
  status: "active" | "disabled";
};
