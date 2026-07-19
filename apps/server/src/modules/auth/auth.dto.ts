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
