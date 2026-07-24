import { t } from "elysia";

export const ApplicationUsageEventTypeDto = t.Union([
  t.Literal("signup"),
  t.Literal("login"),
  t.Literal("social_callback"),
  t.Literal("authorization"),
  t.Literal("token"),
  t.Literal("logout"),
  t.Literal("membership"),
]);

export const ApplicationUsageOutcomeDto = t.Union([
  t.Literal("success"),
  t.Literal("denied"),
  t.Literal("error"),
]);

export const ApplicationUsageAuthMethodDto = t.Union([
  t.Literal("password"),
  t.Literal("magic_link"),
  t.Literal("google"),
  t.Literal("github"),
  t.Literal("facebook"),
  t.Literal("linkedin"),
  t.Literal("existing_session"),
]);

const ApplicationUsageFiltersDto = {
  dateFrom: t.Optional(t.String({ format: "date" })),
  dateTo: t.Optional(t.String({ format: "date" })),
  applicationId: t.Optional(t.String()),
  applicationClientId: t.Optional(t.String()),
  user: t.Optional(t.String()),
  type: t.Optional(ApplicationUsageEventTypeDto),
  outcome: t.Optional(ApplicationUsageOutcomeDto),
  authMethod: t.Optional(ApplicationUsageAuthMethodDto),
};

export const ApplicationUsageOverviewQueryDto = t.Object(
  ApplicationUsageFiltersDto,
);

export const ApplicationUsageEventsQueryDto = t.Object({
  ...ApplicationUsageFiltersDto,
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export type ApplicationUsageOverviewQuery =
  typeof ApplicationUsageOverviewQueryDto.static;
export type ApplicationUsageEventsQuery =
  typeof ApplicationUsageEventsQueryDto.static;
