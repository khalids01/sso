import { t } from "elysia";

const ApplicationStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("disabled"),
  t.Literal("archived"),
]);

export const ApplicationsQueryDto = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  status: t.Optional(ApplicationStatusSchema),
  search: t.Optional(t.String()),
});

export const CreateApplicationDto = t.Object({
  slug: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  name: t.String({ minLength: 1, maxLength: 120 }),
  description: t.Optional(t.String({ maxLength: 500 })),
  status: t.Optional(ApplicationStatusSchema),
  logoUrl: t.Optional(t.String({ format: "uri" })),
  homepageUrl: t.Optional(t.String({ format: "uri" })),
});

export const CreateApplicationClientDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  clientType: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  status: t.Optional(ApplicationStatusSchema),
  redirectUris: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  allowedOrigins: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

export type ApplicationsQuery = typeof ApplicationsQueryDto.static;
export type CreateApplicationInput = typeof CreateApplicationDto.static;
export type CreateApplicationClientInput =
  typeof CreateApplicationClientDto.static;
