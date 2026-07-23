import { t } from "elysia";

export const OAuthProviderSchema = t.Union([
  t.Literal("google"),
  t.Literal("github"),
  t.Literal("facebook"),
  t.Literal("linkedin"),
]);

const OAuthConnectionStatusSchema = t.Union([
  t.Literal("active"),
  t.Literal("disabled"),
]);

export const OAuthConnectionsQueryDto = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  filter: t.Optional(
    t.Union([t.Literal("current"), t.Literal("archived")]),
  ),
  provider: t.Optional(OAuthProviderSchema),
  search: t.Optional(t.String()),
});

export const CreateOAuthConnectionDto = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  provider: OAuthProviderSchema,
  clientId: t.String({ minLength: 1, maxLength: 500 }),
  clientSecret: t.String({ minLength: 1, maxLength: 1_000 }),
  status: t.Optional(OAuthConnectionStatusSchema),
});

export const UpdateOAuthConnectionDto = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  clientId: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  clientSecret: t.Optional(t.String({ minLength: 1, maxLength: 1_000 })),
  status: t.Optional(OAuthConnectionStatusSchema),
});

export type OAuthConnectionsQuery =
  typeof OAuthConnectionsQueryDto.static;
export type CreateOAuthConnectionInput =
  typeof CreateOAuthConnectionDto.static;
export type UpdateOAuthConnectionInput =
  typeof UpdateOAuthConnectionDto.static;
export type OAuthProviderId = typeof OAuthProviderSchema.static;
