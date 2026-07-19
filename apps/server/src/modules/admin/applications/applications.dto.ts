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

const ApplicationMemberFilterSchema = t.Union([
  t.Literal("current"),
  t.Literal("revoked"),
]);

const ApplicationAuthMethodSchema = t.Union([
  t.Literal("magic_link"),
  t.Literal("password"),
]);
const ApplicationSignupMethodSchema = t.Literal("magic_link");

const ApplicationRegistrationModeSchema = t.Union([
  t.Literal("closed"),
  t.Literal("invite_only"),
  t.Literal("open"),
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
  signInMethods: t.Optional(t.Array(ApplicationAuthMethodSchema, { minItems: 1 })),
  signUpMethods: t.Optional(t.Array(ApplicationSignupMethodSchema)),
  registrationMode: t.Optional(ApplicationRegistrationModeSchema),
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
  signInMethods: t.Optional(t.Array(ApplicationAuthMethodSchema, { minItems: 1 })),
  signUpMethods: t.Optional(t.Array(ApplicationSignupMethodSchema)),
  registrationMode: t.Optional(ApplicationRegistrationModeSchema),
});

export const CreateApplicationInvitationDto = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  expiresInDays: t.Optional(t.Numeric({ minimum: 1, maximum: 30, default: 7 })),
});

export const ClientsQueryDto = t.Object({
  filter: t.Optional(ApplicationListFilterSchema),
});

export const ApplicationMembersQueryDto = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  filter: t.Optional(ApplicationMemberFilterSchema),
  search: t.Optional(t.String()),
});

export const CreateApplicationMemberDto = t.Object({
  userId: t.String({ minLength: 1 }),
});

export const UpdateApplicationClientDto = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  clientType: t.Optional(t.String({ minLength: 1, maxLength: 40 })),
  status: t.Optional(ApplicationStatusSchema),
  redirectUris: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
  allowedOrigins: t.Optional(t.Array(t.String({ minLength: 1 }))),
});

export const UpdateRevocationEndpointDto = t.Object({
  url: t.String({ minLength: 1, maxLength: 2_048 }),
  enabled: t.Boolean(),
});

export const RevocationDeliveriesQueryDto = t.Object({
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 25 })),
});

export type ApplicationsQuery = typeof ApplicationsQueryDto.static;
export type ClientsQuery = typeof ClientsQueryDto.static;
export type ApplicationMembersQuery =
  typeof ApplicationMembersQueryDto.static;
export type CreateApplicationInput = typeof CreateApplicationDto.static;
export type CreateApplicationClientInput =
  typeof CreateApplicationClientDto.static;
export type CreateApplicationMemberInput =
  typeof CreateApplicationMemberDto.static;
export type UpdateApplicationInput = typeof UpdateApplicationDto.static;
export type UpdateApplicationClientInput =
  typeof UpdateApplicationClientDto.static;
export type UpdateRevocationEndpointInput =
  typeof UpdateRevocationEndpointDto.static;
export type CreateApplicationInvitationInput =
  typeof CreateApplicationInvitationDto.static;
