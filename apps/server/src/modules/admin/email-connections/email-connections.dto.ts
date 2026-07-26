import { t } from "elysia";

export const EmailProviderSchema = t.Union([
  t.Literal("resend"),
  t.Literal("nodemailer"),
]);
const StatusSchema = t.Union([t.Literal("active"), t.Literal("disabled")]);

export const EmailConnectionsQueryDto = t.Object({
  page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
  filter: t.Optional(t.Union([t.Literal("current"), t.Literal("archived")])),
  provider: t.Optional(EmailProviderSchema),
  search: t.Optional(t.String()),
});

const CommonFields = {
  name: t.String({ minLength: 1, maxLength: 120 }),
  fromName: t.String({ minLength: 1, maxLength: 120 }),
  fromAddress: t.String({ format: "email", maxLength: 320 }),
  replyToAddress: t.Optional(t.Union([t.String({ format: "email" }), t.Null()])),
  status: t.Optional(StatusSchema),
};

export const CreateEmailConnectionDto = t.Union([
  t.Object({
    ...CommonFields,
    provider: t.Literal("resend"),
    apiKey: t.String({ minLength: 1, maxLength: 2_000 }),
  }),
  t.Object({
    ...CommonFields,
    provider: t.Literal("nodemailer"),
    smtpHost: t.String({ minLength: 1, maxLength: 500 }),
    smtpPort: t.Numeric({ minimum: 1, maximum: 65_535 }),
    smtpSecure: t.Boolean(),
    smtpUsername: t.Optional(t.String({ maxLength: 500 })),
    smtpPassword: t.String({ maxLength: 2_000 }),
  }),
]);

export const UpdateEmailConnectionDto = t.Object({
  name: t.Optional(CommonFields.name),
  fromName: t.Optional(CommonFields.fromName),
  fromAddress: t.Optional(CommonFields.fromAddress),
  replyToAddress: CommonFields.replyToAddress,
  status: t.Optional(StatusSchema),
  apiKey: t.Optional(t.String({ minLength: 1, maxLength: 2_000 })),
  smtpHost: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  smtpPort: t.Optional(t.Numeric({ minimum: 1, maximum: 65_535 })),
  smtpSecure: t.Optional(t.Boolean()),
  smtpUsername: t.Optional(t.String({ maxLength: 500 })),
  smtpPassword: t.Optional(t.String({ maxLength: 2_000 })),
});

export const TestEmailConnectionDto = t.Object({
  to: t.String({ format: "email", maxLength: 320 }),
});

export type EmailConnectionsQuery = typeof EmailConnectionsQueryDto.static;
export type CreateEmailConnectionInput = typeof CreateEmailConnectionDto.static;
export type UpdateEmailConnectionInput = typeof UpdateEmailConnectionDto.static;
