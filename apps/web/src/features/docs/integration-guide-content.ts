export type CodeSample = {
  filename: string;
  code: string;
  description?: string;
};

export const securityChecklist = [
  "Choose one integration path and do not create a second session system.",
  "Keep OAuth tokens, the PKCE flow, and session secrets on the server.",
  "Register the exact callback URL produced by your selected integration path.",
  "Use an encrypted, HttpOnly, Secure, SameSite application-session cookie.",
  "Allow only relative return paths and protect logout against cross-site requests.",
  "Test new users, returning users, logout, invalid callbacks, and protected routes.",
] as const;
