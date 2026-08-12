import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import prisma from "../../db/src/client.server";
import { env } from "../../env/src/env.server";
import nodemailer from "nodemailer";
import { Resend } from "resend";

const encryptionKey = createHmac(
  "sha256",
  env.SOCIAL_PROVIDER_CREDENTIALS_KEY ??
    env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "test" ? "email-provider-test-key" : ""),
)
  .update("platform-email-provider-connections")
  .digest();

export function encryptEmailProviderSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptEmailProviderSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted email provider secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

type Message = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type Connection = {
  id: string;
  provider: "resend" | "nodemailer";
  fromName: string;
  fromAddress: string;
  replyToAddress: string | null;
  encryptedSecret: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUsername: string | null;
  status: "active" | "disabled" | "archived";
};

function fromValue(connection: Connection) {
  return connection.fromName
    ? `${connection.fromName} <${connection.fromAddress}>`
    : connection.fromAddress;
}

function smtpAuth(connection: Connection, password: string) {
  // SMTP providers commonly use the sender's email address as the login. Keep
  // the username override for providers that require a different account, but
  // do not disable authentication when that optional field is blank.
  return {
    user: connection.smtpUsername || connection.fromAddress,
    pass: password,
  };
}

async function deliver(connection: Connection, message: Message) {
  const secret = decryptEmailProviderSecret(connection.encryptedSecret);
  if (connection.provider === "resend") {
    const result = await new Resend(secret).emails.send({
      from: fromValue(connection),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: connection.replyToAddress ?? undefined,
    });
    if (result.error) throw new Error(`resend_${result.error.name}`);
    return result.data;
  }
  if (!connection.smtpHost || !connection.smtpPort) {
    throw new Error("smtp_configuration_invalid");
  }
  return nodemailer
    .createTransport({
      host: connection.smtpHost,
      port: connection.smtpPort,
      secure: connection.smtpSecure ?? false,
      auth: smtpAuth(connection, secret),
    })
    .sendMail({
      from: fromValue(connection),
      replyTo: connection.replyToAddress ?? undefined,
      ...message,
    });
}

function errorCode(error: unknown) {
  const value = error instanceof Error ? error.message : "unknown";
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
}

export async function sendApplicationEmail(
  applicationId: string,
  message: Message,
) {
  const assignments = await prisma.applicationEmailProviderConnection.findMany({
    where: { applicationId },
    select: {
      role: true,
      emailProviderConnection: {
        select: {
          id: true,
          provider: true,
          fromName: true,
          fromAddress: true,
          replyToAddress: true,
          encryptedSecret: true,
          smtpHost: true,
          smtpPort: true,
          smtpSecure: true,
          smtpUsername: true,
          status: true,
        },
      },
    },
  });
  const ordered = (["primary", "fallback"] as const)
    .map((role) =>
      assignments.find((assignment) => assignment.role === role)
        ?.emailProviderConnection,
    )
    .filter((connection): connection is NonNullable<typeof connection> =>
      Boolean(connection && connection.status === "active"),
    );
  if (!ordered.length) throw new Error("application_email_provider_unavailable");

  let lastError: unknown;
  for (const [index, connection] of ordered.entries()) {
    try {
      const result = await deliver(connection, message);
      await prisma.emailDeliveryAttempt.create({
        data: {
          applicationId,
          emailProviderConnectionId: connection.id,
          provider: connection.provider,
          outcome: "sent",
          fallbackUsed: index > 0,
        },
      });
      return result;
    } catch (error) {
      lastError = error;
      await prisma.emailDeliveryAttempt.create({
        data: {
          applicationId,
          emailProviderConnectionId: connection.id,
          provider: connection.provider,
          outcome: "failed",
          fallbackUsed: index > 0,
          errorCode: errorCode(error),
        },
      });
    }
  }
  throw lastError;
}

export async function getApplicationIdFromEmailUrl(url: string) {
  let value = url;
  for (let depth = 0; depth < 3; depth += 1) {
    try {
      const parsed = new URL(value);
      const clientId = parsed.searchParams.get("client_id");
      if (clientId) {
        const client = await prisma.applicationClient.findUnique({
          where: { clientId },
          select: { applicationId: true },
        });
        return client?.applicationId ?? null;
      }
      const nested =
        parsed.searchParams.get("callbackURL") ??
        parsed.searchParams.get("callback_url");
      if (!nested) return null;
      value = nested;
    } catch {
      return null;
    }
  }
  return null;
}
