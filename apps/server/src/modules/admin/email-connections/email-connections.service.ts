import prisma, { Prisma } from "@db/server";
import {
  decryptEmailProviderSecret,
  encryptEmailProviderSecret,
  testEmailTemplate,
} from "@email/server";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import type {
  CreateEmailConnectionInput,
  EmailConnectionsQuery,
  UpdateEmailConnectionInput,
} from "./email-connections.dto";

const select = {
  id: true,
  name: true,
  provider: true,
  fromName: true,
  fromAddress: true,
  replyToAddress: true,
  smtpHost: true,
  smtpPort: true,
  smtpSecure: true,
  smtpUsername: true,
  credentialVersion: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { applicationAssignments: true } },
} satisfies Prisma.EmailProviderConnectionSelect;

export class EmailConnectionsPolicyError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

const clean = (value: string) => value.trim();
const map = (row: Prisma.EmailProviderConnectionGetPayload<{ select: typeof select }>) => ({
  ...row,
  applicationCount: row._count.applicationAssignments,
  _count: undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

async function activity(type: string, row: { id: string; name: string; provider: string }, actor?: string) {
  await prisma.activityEvent.create({
    data: {
      type,
      actorUserId: actor ?? null,
      message: `Email connection ${type.split(".").at(-1)}: ${row.name}`,
      metadata: { emailProviderConnectionId: row.id, provider: row.provider },
    },
  });
}

export class EmailConnectionsService {
  async list(query: EmailConnectionsQuery) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const requested = Math.max(query.page ?? 1, 1);
    const where: Prisma.EmailProviderConnectionWhereInput = {
      status: query.filter === "archived" ? "archived" : { not: "archived" },
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.search?.trim()
        ? { name: { contains: query.search.trim(), mode: "insensitive" } }
        : {}),
    };
    const total = await prisma.emailProviderConnection.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requested, pages);
    const rows = await prisma.emailProviderConnection.findMany({
      where, select, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
    });
    return { items: rows.map(map), total, pages, page, limit };
  }

  async options() {
    return {
      items: await prisma.emailProviderConnection.findMany({
        where: { status: "active" },
        select: { id: true, name: true, provider: true, status: true },
        orderBy: [{ provider: "asc" }, { name: "asc" }],
      }),
    };
  }

  async getById(id: string) {
    const row = await prisma.emailProviderConnection.findUnique({ where: { id }, select });
    if (!row) throw new EmailConnectionsPolicyError("Email connection not found", 404);
    return map(row);
  }

  async revealSecret(id: string, actor?: string) {
    const connection = await prisma.emailProviderConnection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        provider: true,
        encryptedSecret: true,
      },
    });
    if (!connection) {
      throw new EmailConnectionsPolicyError("Email connection not found", 404);
    }
    await activity(
      "email_connection.secret_revealed",
      connection,
      actor,
    );
    return {
      secret: decryptEmailProviderSecret(connection.encryptedSecret),
    };
  }

  async create(input: CreateEmailConnectionInput, actor?: string) {
    try {
      const secret = input.provider === "resend" ? input.apiKey : input.smtpPassword;
      const row = await prisma.emailProviderConnection.create({
        data: {
          name: clean(input.name),
          provider: input.provider,
          fromName: clean(input.fromName),
          fromAddress: clean(input.fromAddress),
          replyToAddress: input.replyToAddress?.trim() || null,
          encryptedSecret: encryptEmailProviderSecret(secret),
          status: input.status ?? "active",
          ...(input.provider === "nodemailer"
            ? {
                smtpHost: clean(input.smtpHost),
                smtpPort: input.smtpPort,
                smtpSecure: input.smtpSecure,
                smtpUsername: input.smtpUsername?.trim() || null,
              }
            : {}),
        },
        select,
      });
      await activity("email_connection.created", row, actor);
      return map(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new EmailConnectionsPolicyError("An email connection with this name already exists", 409);
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateEmailConnectionInput, actor?: string) {
    const current = await prisma.emailProviderConnection.findUnique({ where: { id } });
    if (!current) throw new EmailConnectionsPolicyError("Email connection not found", 404);
    if (current.status === "archived") throw new EmailConnectionsPolicyError("Restore this connection before editing it");
    if (current.provider === "resend" && (input.smtpHost !== undefined || input.smtpPassword !== undefined)) {
      throw new EmailConnectionsPolicyError("SMTP fields cannot be used for a Resend connection");
    }
    if (current.provider === "nodemailer" && input.apiKey !== undefined) {
      throw new EmailConnectionsPolicyError("Resend API keys cannot be used for an SMTP connection");
    }
    const replacement = input.apiKey ?? input.smtpPassword;
    const row = await prisma.emailProviderConnection.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: clean(input.name) } : {}),
        ...(input.fromName !== undefined ? { fromName: clean(input.fromName) } : {}),
        ...(input.fromAddress !== undefined ? { fromAddress: clean(input.fromAddress) } : {}),
        ...(input.replyToAddress !== undefined ? { replyToAddress: input.replyToAddress?.trim() || null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.smtpHost !== undefined ? { smtpHost: clean(input.smtpHost) } : {}),
        ...(input.smtpPort !== undefined ? { smtpPort: input.smtpPort } : {}),
        ...(input.smtpSecure !== undefined ? { smtpSecure: input.smtpSecure } : {}),
        ...(input.smtpUsername !== undefined ? { smtpUsername: input.smtpUsername.trim() || null } : {}),
        ...(replacement !== undefined
          ? { encryptedSecret: encryptEmailProviderSecret(replacement), credentialVersion: { increment: 1 } }
          : {}),
      },
      select,
    });
    await activity("email_connection.updated", row, actor);
    return map(row);
  }

  async test(id: string, to: string) {
    const connection = await prisma.emailProviderConnection.findUnique({ where: { id } });
    if (!connection) throw new EmailConnectionsPolicyError("Email connection not found", 404);
    if (connection.status !== "active") throw new EmailConnectionsPolicyError("Only active connections can send tests");
    const from = `${connection.fromName} <${connection.fromAddress}>`;
    const secret = decryptEmailProviderSecret(connection.encryptedSecret);
    const html = await testEmailTemplate(connection.name);
    if (connection.provider === "resend") {
      const result = await new Resend(secret).emails.send({
        from, to, subject: "Your SSO email connection is ready", html,
        replyTo: connection.replyToAddress ?? undefined,
      });
      if (result.error) throw new EmailConnectionsPolicyError(`Test failed: ${result.error.name}`);
    } else {
      if (!connection.smtpHost || !connection.smtpPort) throw new EmailConnectionsPolicyError("SMTP configuration is incomplete");
      await nodemailer.createTransport({
        host: connection.smtpHost, port: connection.smtpPort, secure: connection.smtpSecure ?? false,
        auth: connection.smtpUsername ? { user: connection.smtpUsername, pass: secret } : undefined,
      }).sendMail({ from, to, subject: "Your SSO email connection is ready", html });
    }
    return { success: true };
  }

  async lifecycle(id: string, status: "active" | "archived", actor?: string) {
    const row = await prisma.emailProviderConnection.update({ where: { id }, data: { status }, select }).catch(() => null);
    if (!row) throw new EmailConnectionsPolicyError("Email connection not found", 404);
    await activity(`email_connection.${status === "active" ? "restored" : "archived"}`, row, actor);
    return map(row);
  }

  async deletePermanent(id: string) {
    const row = await prisma.emailProviderConnection.findUnique({ where: { id }, select });
    if (!row) throw new EmailConnectionsPolicyError("Email connection not found", 404);
    if (row.status !== "archived") throw new EmailConnectionsPolicyError("Only archived connections can be permanently deleted");
    if (row._count.applicationAssignments) throw new EmailConnectionsPolicyError("Remove all application assignments before deleting this connection");
    await prisma.emailProviderConnection.delete({ where: { id } });
    return { success: true };
  }
}

export const emailConnectionsService = new EmailConnectionsService();
