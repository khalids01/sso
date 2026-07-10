import prisma, { type Prisma } from "@db/server";
import type {
  ApplicationsQuery,
  CreateApplicationClientInput,
  CreateApplicationInput,
} from "./applications.dto";
import {
  ApplicationUrlValidationError,
  normalizeOrigins,
  normalizeRedirectUris,
} from "./redirect-validation";

const allowedStatuses = new Set(["active", "disabled", "archived"]);

export type AdminApplicationsActor = {
  id?: string;
};

export class ApplicationsPolicyError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ApplicationsPolicyError";
  }
}

function normalizePagination(page?: number, limit?: number) {
  const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  return {
    limit: normalizedLimit,
    requestedPage: Math.max(page ?? 1, 1),
  };
}

function normalizeSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new ApplicationsPolicyError("Application slug is required");
  }

  return slug;
}

function normalizeStatus(status?: string) {
  const normalized = status ?? "active";

  if (!allowedStatuses.has(normalized)) {
    throw new ApplicationsPolicyError("Invalid application status");
  }

  return normalized;
}

function mapApplication(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  logoUrl: string | null;
  homepageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { clients: number };
}) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    logoUrl: row.logoUrl,
    homepageUrl: row.homepageUrl,
    clientCount: row._count?.clients ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapClient(row: {
  id: string;
  applicationId: string;
  clientId: string;
  name: string;
  clientType: string;
  status: string;
  redirectUris: string[];
  allowedOrigins: string[];
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function generateClientId() {
  return `sso_client_${crypto.randomUUID().replaceAll("-", "")}`;
}

async function recordApplicationActivity(input: {
  type: string;
  actorUserId?: string | null;
  message: string;
  metadata: Prisma.InputJsonValue;
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        type: input.type,
        actorUserId: input.actorUserId ?? null,
        targetUserId: null,
        visitorId: null,
        severity: "info",
        message: input.message,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("Application activity event recording failed", error);
  }
}

export class AdminApplicationsService {
  async list(query: ApplicationsQuery) {
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.ApplicationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.application.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.application.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        logoUrl: true,
        homepageUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clients: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map(mapApplication),
      total,
      pages,
      page,
      limit,
    };
  }

  async create(input: CreateApplicationInput, actor: AdminApplicationsActor) {
    const application = await prisma.application.create({
      data: {
        slug: normalizeSlug(input.slug ?? input.name),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: normalizeStatus(input.status),
        logoUrl: input.logoUrl ?? null,
        homepageUrl: input.homepageUrl ?? null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        logoUrl: true,
        homepageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordApplicationActivity({
      type: "application.created",
      actorUserId: actor.id ?? null,
      message: `Application created: ${application.name}`,
      metadata: {
        applicationId: application.id,
        slug: application.slug,
      },
    });

    return mapApplication(application);
  }

  async listClients(applicationId: string) {
    const rows = await prisma.applicationClient.findMany({
      where: { applicationId },
      select: {
        id: true,
        applicationId: true,
        clientId: true,
        name: true,
        clientType: true,
        status: true,
        redirectUris: true,
        allowedOrigins: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      items: rows.map(mapClient),
    };
  }

  async createClient(
    applicationId: string,
    input: CreateApplicationClientInput,
    actor: AdminApplicationsActor,
  ) {
    let redirectUris: string[];
    let allowedOrigins: string[];

    try {
      redirectUris = normalizeRedirectUris(input.redirectUris);
      allowedOrigins = normalizeOrigins(input.allowedOrigins ?? []);
    } catch (error) {
      if (error instanceof ApplicationUrlValidationError) {
        throw new ApplicationsPolicyError(error.message);
      }
      throw error;
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, name: true },
    });

    if (!application) {
      throw new ApplicationsPolicyError("Application not found", 404);
    }

    const client = await prisma.applicationClient.create({
      data: {
        applicationId,
        clientId: generateClientId(),
        name: input.name.trim(),
        clientType: input.clientType?.trim() || "public",
        status: normalizeStatus(input.status),
        redirectUris,
        allowedOrigins,
      },
      select: {
        id: true,
        applicationId: true,
        clientId: true,
        name: true,
        clientType: true,
        status: true,
        redirectUris: true,
        allowedOrigins: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordApplicationActivity({
      type: "application_client.created",
      actorUserId: actor.id ?? null,
      message: `Application client created: ${client.name}`,
      metadata: {
        applicationId,
        clientId: client.clientId,
      },
    });

    return mapClient(client);
  }
}

export const adminApplicationsService = new AdminApplicationsService();
