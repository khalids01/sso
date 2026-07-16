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
    applications: {
      all: () => ["admin-applications"] as const,
      detail: (applicationId: string) =>
        [...queryKeys.admin.applications.all(), applicationId, "detail"] as const,
      list: (filter?: "current" | "archived") =>
        [...queryKeys.admin.applications.all(), "list", filter ?? "all"] as const,
      clientsRoot: (applicationId: string) =>
        [...queryKeys.admin.applications.all(), applicationId, "clients"] as const,
      clients: (applicationId: string, filter?: "current" | "archived") =>
        [
          ...queryKeys.admin.applications.clientsRoot(applicationId),
          filter ?? "all",
        ] as const,
      membersRoot: (applicationId: string) =>
        [...queryKeys.admin.applications.all(), applicationId, "members"] as const,
      members: (
        applicationId: string,
        filter?: "current" | "revoked",
        search?: string,
      ) =>
        [
          ...queryKeys.admin.applications.membersRoot(applicationId),
          filter ?? "all",
          search ?? "",
        ] as const,
      revocation: (applicationId: string) =>
        [...queryKeys.admin.applications.all(), applicationId, "revocation"] as const,
      revocationDeliveries: (applicationId: string) =>
        [...queryKeys.admin.applications.revocation(applicationId), "deliveries"] as const,
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
