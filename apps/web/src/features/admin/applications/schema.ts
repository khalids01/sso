import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "active",
  "disabled",
  "archived",
]);

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined);

const httpUrlSchema = (label: string) =>
  z.string().trim().superRefine((value, ctx) => {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be a valid URL`,
      });
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({
        code: "custom",
        message: `${label} must use http or https`,
      });
    }
  });

export function textLinesToList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const createApplicationDefaults: CreateApplicationFormValues = {
  name: "",
  slug: "",
  description: "",
  status: "active",
};

export const createApplicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: optionalTrimmedString(80),
  description: optionalTrimmedString(500),
  status: applicationStatusSchema.default("active"),
});

export const createApplicationClientDefaults: CreateApplicationClientFormValues = {
  name: "",
  status: "active",
  redirectUris: "",
  allowedOrigins: "",
};

export const createApplicationClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    status: applicationStatusSchema.default("active"),
    redirectUris: z
      .string()
      .trim()
      .min(1, "At least one redirect URI is required"),
    allowedOrigins: z.string(),
  })
  .superRefine((value, ctx) => {
    for (const [index, redirectUri] of textLinesToList(value.redirectUris).entries()) {
      const result = httpUrlSchema("Redirect URI").safeParse(redirectUri);

      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["redirectUris"],
          message: `Line ${index + 1}: ${result.error.issues[0]?.message}`,
        });
        continue;
      }

      if (new URL(redirectUri).hash) {
        ctx.addIssue({
          code: "custom",
          path: ["redirectUris"],
          message: `Line ${index + 1}: Redirect URI must not contain a fragment`,
        });
      }
    }

    for (const [index, origin] of textLinesToList(value.allowedOrigins).entries()) {
      const result = httpUrlSchema("Origin").safeParse(origin);

      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["allowedOrigins"],
          message: `Line ${index + 1}: ${result.error.issues[0]?.message}`,
        });
      }
    }
  })
  .transform((value) => {
    const allowedOrigins = textLinesToList(value.allowedOrigins);

    return {
      name: value.name.trim(),
      status: value.status,
      redirectUris: textLinesToList(value.redirectUris),
      allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : undefined,
    };
  });

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type CreateApplicationFormValues = z.input<typeof createApplicationSchema>;
export type CreateApplicationInput = z.output<typeof createApplicationSchema>;
export type CreateApplicationClientFormValues = z.input<
  typeof createApplicationClientSchema
>;
export type CreateApplicationClientInput = z.output<
  typeof createApplicationClientSchema
>;
