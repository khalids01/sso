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

function trimValues(values: string[]) {
  return values
    .map((line) => line.trim())
    .filter(Boolean);
}

function getHttpUrlError(value: string) {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    return "must be a valid URL";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "must use http or https";
  }

  return undefined;
}

export const createApplicationDefaults: CreateApplicationFormValues = {
  name: "",
  slug: "",
  description: "",
  status: "active",
  signInMethods: ["magic_link", "password"],
  signUpMethods: ["magic_link"],
  registrationMode: "closed",
};

export const createApplicationSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: optionalTrimmedString(80),
    description: optionalTrimmedString(500),
    status: applicationStatusSchema.default("active"),
    signInMethods: z
      .array(
        z.enum([
          "magic_link",
          "password",
          "google",
          "facebook",
          "linkedin",
          "github",
        ]),
      )
      .min(1),
    signUpMethods: z.array(
      z.enum(["magic_link", "google", "facebook", "linkedin", "github"]),
    ),
    registrationMode: z.enum(["closed", "invite_only", "open"]),
  })
  .refine(
    (value) => value.signUpMethods.every((method) => value.signInMethods.includes(method)),
    { path: ["signUpMethods"], message: "Signup methods must also be enabled for sign-in" },
  );

export const createApplicationClientDefaults: CreateApplicationClientFormValues = {
  name: "",
  status: "active",
  redirectUris: [""],
  allowedOrigins: [""],
};

export const createApplicationClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    status: applicationStatusSchema.default("active"),
    redirectUris: z.array(z.string()),
    allowedOrigins: z.array(z.string()),
  })
  .superRefine((value, ctx) => {
    const redirectUris = trimValues(value.redirectUris);

    if (redirectUris.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["redirectUris", 0],
        message: "At least one redirect URI is required",
      });
    }

    for (const [index, redirectUri] of value.redirectUris.entries()) {
      const trimmed = redirectUri.trim();
      if (!trimmed) {
        continue;
      }

      const urlError = getHttpUrlError(redirectUri);

      if (urlError) {
        ctx.addIssue({
          code: "custom",
          path: ["redirectUris", index],
          message: `Redirect URI ${index + 1} ${urlError}`,
        });
        continue;
      }

      if (new URL(redirectUri.trim()).hash) {
        ctx.addIssue({
          code: "custom",
          path: ["redirectUris", index],
          message: `Redirect URI ${index + 1} must not contain a fragment`,
        });
      }
    }

    for (const [index, origin] of value.allowedOrigins.entries()) {
      if (!origin.trim()) {
        continue;
      }

      const urlError = getHttpUrlError(origin);

      if (urlError) {
        ctx.addIssue({
          code: "custom",
          path: ["allowedOrigins", index],
          message: `Origin ${index + 1} ${urlError}`,
        });
      }
    }
  })
  .transform((value) => {
    const allowedOrigins = trimValues(value.allowedOrigins);

    return {
      name: value.name.trim(),
      status: value.status,
      redirectUris: trimValues(value.redirectUris),
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
