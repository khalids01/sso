import { z } from "zod";

export const emailSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const passwordSignInSchema = emailSchema.extend({
  password: z.string().min(1, "Enter your password").max(128),
});

export type EmailSignInValues = z.infer<typeof emailSchema>;
export type PasswordSignInValues = z.infer<typeof passwordSignInSchema>;
