import { t } from "elysia";

export const CheckEmailDto = t.Object({
  email: t.String(),
});

export const MagicLinkLoginDto = t.Object({
  email: t.String(),
  callbackURL: t.Optional(t.String()),
});

export const MagicLinkSignupDto = t.Object({
  email: t.String(),
  name: t.String(),
  callbackURL: t.Optional(t.String()),
});

export const PasswordLoginDto = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  password: t.String({ minLength: 1, maxLength: 128 }),
  callbackURL: t.Optional(t.String()),
});

export const PasswordSignupDto = t.Object({
  email: t.String({ format: "email", maxLength: 320 }),
  name: t.String({ minLength: 2, maxLength: 120 }),
  password: t.String({ minLength: 15, maxLength: 128 }),
  callbackURL: t.String(),
});

export const SocialLoginDto = t.Object({
  provider: t.Union([
    t.Literal("google"),
    t.Literal("facebook"),
    t.Literal("github"),
    t.Literal("linkedin"),
  ]),
  callbackURL: t.String(),
  requestSignUp: t.Optional(t.Boolean()),
});

export const ApplicationAuthBootstrapDto = t.Object({
  clientId: t.String({ minLength: 1 }),
  oauthQuery: t.String({ minLength: 1 }),
});

const EmbeddedAuthorizationDto = t.Object({
  clientId: t.String({ minLength: 1 }),
  redirectUri: t.String({ format: "uri" }),
  origin: t.String({ format: "uri" }),
  state: t.String({ minLength: 20, maxLength: 256 }),
  nonce: t.String({ minLength: 20, maxLength: 256 }),
  codeChallenge: t.String({ minLength: 43, maxLength: 43 }),
});

export const EmbeddedPasswordLoginDto = t.Composite([
  EmbeddedAuthorizationDto,
  t.Object({
    email: t.String({ format: "email", maxLength: 320 }),
    password: t.String({ minLength: 1, maxLength: 128 }),
  }),
]);

export const EmbeddedPasswordSignupDto = t.Composite([
  EmbeddedAuthorizationDto,
  t.Object({
    name: t.String({ minLength: 2, maxLength: 120 }),
    email: t.String({ format: "email", maxLength: 320 }),
    password: t.String({ minLength: 15, maxLength: 128 }),
  }),
]);

export const EmbeddedPasswordResetRequestDto = t.Object({
  clientId: t.String({ minLength: 1 }),
  redirectUri: t.String({ format: "uri" }),
  origin: t.String({ format: "uri" }),
  email: t.String({ format: "email", maxLength: 320 }),
});

export const EmbeddedMagicLinkDto = t.Composite([
  EmbeddedAuthorizationDto,
  t.Object({
    intent: t.Union([t.Literal("signin"), t.Literal("signup")]),
    email: t.String({ format: "email", maxLength: 320 }),
    name: t.Optional(t.String({ minLength: 2, maxLength: 120 })),
  }),
]);
