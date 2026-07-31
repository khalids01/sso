import { t } from "elysia";

const Method = t.Union([
  t.Literal("magic_link"),
  t.Literal("password"),
  t.Literal("google"),
  t.Literal("facebook"),
  t.Literal("github"),
  t.Literal("linkedin"),
]);
const OAuthConnections = t.Object({
  google: t.Optional(t.Union([t.String(), t.Null()])),
  facebook: t.Optional(t.Union([t.String(), t.Null()])),
  github: t.Optional(t.Union([t.String(), t.Null()])),
  linkedin: t.Optional(t.Union([t.String(), t.Null()])),
});

export const UpdatePlatformAuthDto = t.Object({
  signInMethods: t.Array(Method, { minItems: 1 }),
  signUpMethods: t.Array(Method),
  registrationMode: t.Union([
    t.Literal("open"),
    t.Literal("invite_only"),
    t.Literal("closed"),
  ]),
  oauthConnections: t.Optional(OAuthConnections),
});

export type UpdatePlatformAuthInput = typeof UpdatePlatformAuthDto.static;
