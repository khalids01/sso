import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import prisma from "@db/server";
import { env } from "@env/server";
import type {
  ApplicationSocialProviderCredentials,
  ApplicationSocialProviderId,
} from "@auth/server";

const encryptionKey = createHmac(
  "sha256",
  env.SOCIAL_PROVIDER_CREDENTIALS_KEY ?? env.BETTER_AUTH_SECRET,
)
  .update("application-social-provider-credentials")
  .digest();
const contextTtlMs = 10 * 60 * 1_000;

export function encryptSocialProviderSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSocialProviderSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted social provider secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getClientSocialProviderCredentials(
  clientId: string,
  provider: ApplicationSocialProviderId,
): Promise<ApplicationSocialProviderCredentials | null> {
  const credential = await prisma.applicationSocialProviderCredential.findFirst({
    where: {
      provider,
      applicationClient: {
        clientId,
        status: "active",
        oauthDisabled: false,
        application: { status: "active" },
      },
    },
    select: { clientId: true, encryptedSecret: true },
  });
  if (!credential) return null;
  return {
    clientId: credential.clientId,
    clientSecret: decryptSocialProviderSecret(credential.encryptedSecret),
  };
}

type SocialContext = {
  provider: ApplicationSocialProviderId;
  clientId: string;
  expiresAt: number;
};

export function createSocialProviderContext(
  provider: ApplicationSocialProviderId,
  clientId: string,
) {
  const payload = Buffer.from(
    JSON.stringify({ provider, clientId, expiresAt: Date.now() + contextTtlMs }),
  ).toString("base64url");
  const signature = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySocialProviderContext(value: string): SocialContext | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(payload)
    .digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SocialContext;
    if (!(["google", "facebook", "github"] as string[]).includes(parsed.provider)) return null;
    if (!parsed.clientId || parsed.expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function socialProviderContextCookieName(provider: ApplicationSocialProviderId) {
  return `sso_social_${provider}`;
}

export function socialProviderContextCookie(
  provider: ApplicationSocialProviderId,
  value: string,
) {
  return `${socialProviderContextCookieName(provider)}=${value}; Path=/api/auth/callback/${provider}; HttpOnly; SameSite=Lax; Max-Age=600${env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearSocialProviderContextCookie(provider: ApplicationSocialProviderId) {
  return `${socialProviderContextCookieName(provider)}=; Path=/api/auth/callback/${provider}; HttpOnly; SameSite=Lax; Max-Age=0${env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function readCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return parts.join("=");
  }
  return null;
}
