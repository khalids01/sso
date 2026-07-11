import { t } from "elysia";

const ApplicationStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("disabled"),
  t.Literal("archived"),
]);

const ApplicationListFilterSchema = t.Union([
  t.Literal("current"),
  t.Literal("archived"),
]);

export const ApplicationsQueryDto = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  status: t.Optional(ApplicationStatusSchema),
  filter: t.Optional(ApplicationListFilterSchema),
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

export const UpdateApplicationDto = t.Object({
  slug: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  description: t.Optional(t.String({ maxLength: 500 })),
  status: t.Optional(ApplicationStatusSchema),
  logoUrl: t.Optional(t.String({ format: "uri" })),
  homepageUrl: t.Optional(t.String({ format: "uri" })),
});

export const ClientsQueryDto = t.Object({
  filter: t.Optional(ApplicationListFilterSchema),
});

export const UpdateApplicationClientDto = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  clientType: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  status: t.Optional(ApplicationStatusSchema),
  redirectUris: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
  allowedOrigins: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

export type ApplicationsQuery = typeof ApplicationsQueryDto.static;
export type ClientsQuery = typeof ClientsQueryDto.static;
export type CreateApplicationInput = typeof CreateApplicationDto.static;
export type CreateApplicationClientInput =
  typeof CreateApplicationClientDto.static;
export type UpdateApplicationInput = typeof UpdateApplicationDto.static;
export type UpdateApplicationClientInput =
  typeof UpdateApplicationClientDto.static;
