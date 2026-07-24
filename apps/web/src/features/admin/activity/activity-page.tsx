import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/constants/query-keys";
import { useObject } from "@/hooks/use-object";
import { client } from "@/lib/client";

type ActivitySeverity = "info" | "warning" | "error";
type SeverityFilter = "all" | ActivitySeverity;

type ActivityUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
};

type ActivityItem = {
  id: string;
  type: string;
  actorUserId: string | null;
  targetUserId: string | null;
  severity: ActivitySeverity;
  message: string;
  metadata: unknown;
  createdAt: string;
  actorUser: ActivityUser | null;
  targetUser: ActivityUser | null;
};

type ActivityResponse = {
  items: ActivityItem[];
  total: number;
  pages: number;
  page: number;
  limit: number;
};

const EVENT_TYPES = [
  "user.invited",
  "user.role_updated",
  "user.banned",
  "user.unbanned",
  "user.archived",
  "user.restored",
  "feedback.submitted",
  "feedback.status_updated",
];

const severityVariant: Record<ActivitySeverity, "default" | "secondary" | "destructive"> = {
  info: "secondary",
  warning: "default",
  error: "destructive",
};

export function AdminActivityPage() {
  const { object: filters, setObjectValue } = useObject({
    type: "all",
    severity: "all" as SeverityFilter,
    page: 1,
    limit: 20,
  });

  const queryParams = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      type: filters.type,
      severity: filters.severity,
    }),
    [filters.limit, filters.page, filters.severity, filters.type],
  );

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.activity.list(queryParams),
    queryFn: async () => {
      const { data, error } = await client.admin.activity.get({
        query: {
          page: filters.page,
          limit: filters.limit,
          type: filters.type === "all" ? undefined : filters.type,
          severity: filters.severity === "all" ? undefined : filters.severity,
        },
      });

      if (error) {
        throw new Error("Failed to load activity");
      }

      return data as ActivityResponse;
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Activity
          </h1>
          <p className="text-sm text-muted-foreground">
            Important backend-confirmed events for admin and support monitoring.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            value={filters.type}
            onValueChange={(value) => {
              setObjectValue("type", value);
              setObjectValue("page", 1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.severity}
            onValueChange={(value) => {
              setObjectValue("severity", value as SeverityFilter);
              setObjectValue("page", 1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading activity...
            </div>
          ) : data?.items.length ? (
            <div className="divide-y">
              {data.items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              No activity found for these filters.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          disabled={(data?.page ?? filters.page) <= 1}
          onClick={() => setObjectValue("page", Math.max(1, filters.page - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {data?.page ?? filters.page} of {data?.pages ?? 1}
        </span>
        <Button
          variant="outline"
          disabled={(data?.page ?? filters.page) >= (data?.pages ?? 1)}
          onClick={() =>
            setObjectValue(
              "page",
              Math.min(data?.pages ?? filters.page, filters.page + 1),
            )
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={severityVariant[item.severity]}>
            {item.severity}
          </Badge>
          <Badge variant="outline">{item.type}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="break-words text-sm font-medium">{item.message}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {item.actorUser ? (
            <span>Actor: {formatUser(item.actorUser)}</span>
          ) : null}
          {item.targetUser ? (
            <span>Target: {formatUser(item.targetUser)}</span>
          ) : null}
        </div>
      </div>
      <MetadataPreview metadata={item.metadata} />
    </div>
  );
}

function formatUser(user: ActivityUser) {
  return `${user.name} (${user.email})`;
}

function MetadataPreview({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const entries = Object.entries(metadata).slice(0, 4);
  if (entries.length === 0) return null;

  return (
    <dl className="grid min-w-0 gap-1 text-xs text-muted-foreground md:min-w-[220px]">
      {entries.map(([key, value]) => (
        <div key={key} className="flex min-w-0 gap-2 md:justify-end">
          <dt className="shrink-0 font-medium">{key}:</dt>
          <dd className="min-w-0 truncate">{formatMetadataValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatMetadataValue(value: unknown) {
  if (value === null || value === undefined) return "none";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}
