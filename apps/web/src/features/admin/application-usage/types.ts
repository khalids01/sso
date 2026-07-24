export type UsageEventType =
  | "signup"
  | "login"
  | "social_callback"
  | "authorization"
  | "token"
  | "logout"
  | "membership";
export type UsageOutcome = "success" | "denied" | "error";
export type UsageAuthMethod =
  | "password"
  | "magic_link"
  | "google"
  | "github"
  | "facebook"
  | "linkedin"
  | "existing_session";

export type UsageFilters = {
  dateFrom: string;
  dateTo: string;
  applicationId: string;
  applicationClientId: string;
  user: string;
  type: "all" | UsageEventType;
  outcome: "all" | UsageOutcome;
  authMethod: "all" | UsageAuthMethod;
  page: number;
  limit: number;
};

export type UsageOverview = {
  metrics: {
    totalEvents: number;
    uniqueUsers: number;
    signups: number;
    logins: number;
    tokenIssuances: number;
    activeApplications: number;
    denialRate: number;
  };
  series: Array<{
    date: string;
    events: number;
    uniqueUsers: number;
    signups: number;
    logins: number;
    tokens: number;
    denied: number;
  }>;
  filterOptions: {
    applications: Array<{
      id: string;
      name: string;
      clients: Array<{ id: string; name: string; clientId: string }>;
    }>;
  };
};

export type UsageEvent = {
  id: string;
  type: UsageEventType;
  outcome: UsageOutcome;
  authMethod: UsageAuthMethod | null;
  reason: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; image: string | null } | null;
  application: { id: string; name: string; slug: string } | null;
  applicationClient: { id: string; name: string; clientId: string } | null;
  oauthProviderConnection: {
    id: string;
    name: string;
    provider: string;
  } | null;
};

export type UsageEventsResponse = {
  items: UsageEvent[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};
