import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryKeys } from "@/constants/query-keys";
import { useObject } from "@/hooks/use-object";
import { client } from "@/lib/client";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type {
  UsageAuthMethod,
  UsageEventsResponse,
  UsageEventType,
  UsageFilters,
  UsageOutcome,
  UsageOverview,
} from "./types";

function defaultDates() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 86_400_000);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

function apiFilters(filters: UsageFilters) {
  return {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    applicationId: filters.applicationId || undefined,
    applicationClientId: filters.applicationClientId || undefined,
    user: filters.user || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    outcome: filters.outcome === "all" ? undefined : filters.outcome,
    authMethod:
      filters.authMethod === "all" ? undefined : filters.authMethod,
  };
}

export function ApplicationUsagePage(props: { applicationId?: string }) {
  const dates = useMemo(defaultDates, []);
  const { object: filters, setObjectValue } = useObject<UsageFilters>({
    ...dates,
    applicationId: props.applicationId ?? "",
    applicationClientId: "",
    user: "",
    type: "all",
    outcome: "all",
    authMethod: "all",
    page: 1,
    limit: 20,
  });
  const query = apiFilters(filters);
  const overviewQuery = useQuery({
    queryKey: queryKeys.admin.applicationUsage.overview(query),
    queryFn: async () => {
      const { data, error } = await client.admin["application-usage"].overview.get({
        query,
      });
      if (error) throw error;
      return data as UsageOverview;
    },
  });
  const eventsQuery = useQuery({
    queryKey: queryKeys.admin.applicationUsage.events({
      ...query,
      page: filters.page,
      limit: filters.limit,
    }),
    queryFn: async () => {
      const { data, error } = await client.admin["application-usage"].events.get({
        query: { ...query, page: filters.page, limit: filters.limit },
      });
      if (error) throw error;
      return data as UsageEventsResponse;
    },
  });
  const applications = overviewQuery.data?.filterOptions.applications ?? [];
  const clients =
    applications.find((item) => item.id === filters.applicationId)?.clients ?? [];
  const refresh = () => {
    void Promise.all([overviewQuery.refetch(), eventsQuery.refetch()]);
  };
  const setFilter = <K extends keyof UsageFilters>(
    key: K,
    value: UsageFilters[K],
  ) => {
    setObjectValue(key, value);
    if (key !== "page") setObjectValue("page", 1);
  };

  return (
    <div className="w-full min-w-0 space-y-6 overflow-x-hidden">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Application Usage
          </h1>
          <p className="text-sm text-muted-foreground">
            Verified SSO activity across users, applications, and clients.
          </p>
        </div>
        <Button variant="outline" onClick={refresh}>
          <RefreshCw
            className={
              overviewQuery.isFetching || eventsQuery.isFetching
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow usage by identity, access point, event, and outcome.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <LabeledInput
            id="usage-date-from"
            label="Date from"
            type="date"
            value={filters.dateFrom}
            onChange={(value) => setFilter("dateFrom", value)}
          />
          <LabeledInput
            id="usage-date-to"
            label="Date to"
            type="date"
            value={filters.dateTo}
            onChange={(value) => setFilter("dateTo", value)}
          />
          <LabeledInput
            id="usage-user"
            label="User"
            placeholder="Name, email, or user ID"
            value={filters.user}
            onChange={(value) => setFilter("user", value)}
          />
          <FilterSelect
            id="usage-application"
            label="Application"
            value={filters.applicationId || "all"}
            options={[
              { value: "all", label: "All applications" },
              ...applications.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
            onChange={(value) => {
              setFilter("applicationId", value === "all" ? "" : value);
              setObjectValue("applicationClientId", "");
            }}
          />
          <FilterSelect
            id="usage-client"
            label="Client"
            value={filters.applicationClientId || "all"}
            disabled={!filters.applicationId}
            options={[
              { value: "all", label: "All clients" },
              ...clients.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
            onChange={(value) =>
              setFilter("applicationClientId", value === "all" ? "" : value)
            }
          />
          <FilterSelect
            id="usage-type"
            label="Event"
            value={filters.type}
            options={[
              "all",
              "signup",
              "login",
              "social_callback",
              "authorization",
              "token",
              "logout",
              "membership",
            ].map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(value) =>
              setFilter("type", value as "all" | UsageEventType)
            }
          />
          <FilterSelect
            id="usage-outcome"
            label="Outcome"
            value={filters.outcome}
            options={["all", "success", "denied", "error"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(value) =>
              setFilter("outcome", value as "all" | UsageOutcome)
            }
          />
          <FilterSelect
            id="usage-method"
            label="Authentication method"
            value={filters.authMethod}
            options={[
              "all",
              "password",
              "magic_link",
              "google",
              "github",
              "facebook",
              "linkedin",
              "existing_session",
            ].map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
            onChange={(value) =>
              setFilter("authMethod", value as "all" | UsageAuthMethod)
            }
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Unique users", overviewQuery.data?.metrics.uniqueUsers],
          ["Signups", overviewQuery.data?.metrics.signups],
          ["Logins", overviewQuery.data?.metrics.logins],
          ["Token issuances", overviewQuery.data?.metrics.tokenIssuances],
          ["Active applications", overviewQuery.data?.metrics.activeApplications],
          ["Denial rate", `${overviewQuery.data?.metrics.denialRate ?? 0}%`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{value ?? 0}</CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Usage trend</CardTitle>
          <CardDescription>Daily verified SSO events.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              events: { label: "Events", color: "var(--chart-1)" },
              uniqueUsers: { label: "Users", color: "var(--chart-2)" },
              denied: { label: "Denied", color: "var(--chart-3)" },
            }}
            className="h-72 w-full"
          >
            <LineChart data={overviewQuery.data?.series ?? []}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} />
              <YAxis hide allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Line dataKey="events" stroke="var(--color-events)" dot={false} />
              <Line
                dataKey="uniqueUsers"
                stroke="var(--color-uniqueUsers)"
                dot={false}
              />
              <Line dataKey="denied" stroke="var(--color-denied)" dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Usage events</CardTitle>
          <CardDescription>
            {eventsQuery.data?.total ?? 0} matching events
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">User</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="min-w-44">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsQuery.data?.items.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={event.user?.image ?? undefined} />
                          <AvatarFallback>
                            {(event.user?.name ?? "?").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {event.user?.name ?? "Unknown user"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {event.user?.email ?? "No linked identity"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.application ? (
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() =>
                            setFilter("applicationId", event.application!.id)
                          }
                        >
                          {event.application.name}
                        </Button>
                      ) : (
                        "Platform"
                      )}
                    </TableCell>
                    <TableCell>
                      {event.applicationClient?.name ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize">
                      {event.type.replaceAll("_", " ")}
                    </TableCell>
                    <TableCell className="capitalize">
                      {event.authMethod?.replaceAll("_", " ") ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          variant={
                            event.outcome === "success"
                              ? "secondary"
                              : event.outcome === "denied"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {event.outcome}
                        </Badge>
                        {event.reason ? (
                          <div className="max-w-48 text-xs text-muted-foreground">
                            {event.reason.replaceAll("_", " ")}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(event.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {!eventsQuery.isLoading && !eventsQuery.data?.items.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center">
                      No usage events match these filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t p-4">
            <span className="text-sm text-muted-foreground">
              Page {eventsQuery.data?.page ?? 1} of {eventsQuery.data?.pages ?? 1}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={(eventsQuery.data?.page ?? 1) <= 1}
                onClick={() => setFilter("page", Math.max(1, filters.page - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  (eventsQuery.data?.page ?? 1) >=
                  (eventsQuery.data?.pages ?? 1)
                }
                onClick={() => setFilter("page", filters.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LabeledInput(props: {
  id: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={props.id} className="mb-1 block text-sm">
        {props.label}
      </label>
      <Input
        id={props.id}
        type={props.type}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}

function FilterSelect(props: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={props.id} className="mb-1 block text-sm">
        {props.label}
      </label>
      <Select
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onChange}
      >
        <SelectTrigger id={props.id} className="w-full capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {props.options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="capitalize"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
