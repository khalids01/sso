import { t } from "elysia";

export const ProfileActionDto = t.Union([
  t.Object({
    action: t.Literal("update_name"),
    name: t.String({ minLength: 2, maxLength: 120 }),
  }),
  t.Object({ action: t.Literal("resend_verification") }),
  t.Object({
    action: t.Literal("revoke_session"),
    sessionId: t.String({ minLength: 1, maxLength: 200 }),
  }),
  t.Object({ action: t.Literal("revoke_other_sessions") }),
  t.Object({
    action: t.Literal("unlink_account"),
    accountId: t.String({ minLength: 1, maxLength: 200 }),
  }),
]);
