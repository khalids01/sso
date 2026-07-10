export const queryKeys = {
  session: {
    devices: () => ["session-devices"] as const,
  },
  admin: {
    overview: () => ["admin-overview"] as const,
    rateLimit: () => ["admin-rate-limit"] as const,
    feedback: (page: number) => ["admin-feedback", page] as const,
    activity: {
      list: (params: {
        page: number;
        limit: number;
        type: string;
        severity: "all" | "info" | "warning" | "error";
      }) => ["admin-activity", params] as const,
    },
    webhooks: {
      list: (params: {
        page: number;
        limit: number;
        status: "all" | "processing" | "processed" | "failed";
        eventType: string;
      }) => ["admin-webhooks", params] as const,
    },
    visitors: {
      overview: (params: {
        dateFrom: string;
        dateTo: string;
        segment: "humans" | "bots" | "all";
        type: "all" | "new" | "returning";
      }) => ["admin-visitors-overview", params] as const,
      list: (params: {
        dateFrom: string;
        dateTo: string;
        segment: "humans" | "bots" | "all";
        type: "all" | "new" | "returning";
        page: number;
        limit: number;
      }) => ["admin-visitors-list", params] as const,
    },
    roles: {
      all: () => ["admin-roles"] as const,
      list: () => [...queryKeys.admin.roles.all(), "list"] as const,
      detail: (roleId: string) => [...queryKeys.admin.roles.all(), roleId] as const,
      permissions: () => [...queryKeys.admin.roles.all(), "permissions"] as const,
      assignable: () => [...queryKeys.admin.roles.all(), "assignable"] as const,
    },
    users: {
      all: () => ["admin-users"] as const,
      list: (search: string) => [...queryKeys.admin.users.all(), search] as const,
      sessions: (userId: string) => ["user-sessions", userId] as const,
    },
    invitations: {
      all: () => ["admin-invitations"] as const,
      list: (params: {
        search: string;
        status: "all" | "accepted" | "pending";
        dateFrom: string;
        dateTo: string;
        page: number;
      }) => [...queryKeys.admin.invitations.all(), params] as const,
    },
  },
  invitations: {
    detail: (invitationId: string) => ["invitation", invitationId] as const,
  },
} as const;
