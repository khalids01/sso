import { randomBytes } from "node:crypto";
import prisma, { Prisma } from "@db/server";
import type {
  ApplicationMembersQuery,
  ApplicationsQuery,
  ClientsQuery,
  CreateApplicationClientInput,
  CreateApplicationMemberInput,
  CreateApplicationInput,
  UpdateApplicationClientInput,
  UpdateApplicationInput,
} from "./applications.dto";
import {
  ApplicationUrlValidationError,
  normalizeOrigins,
  normalizeRedirectUris,
} from "./redirect-validation";

const allowedStatuses = new Set(["active", "disabled", "archived"]);
const allowedMemberStatuses = new Set(["active", "suspended", "revoked"]);

const applicationSelect = {
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
      members: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

const clientSelect = {
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
} satisfies Prisma.ApplicationClientSelect;

const memberSelect = {
  id: true,
  applicationId: true,
  userId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      archived: true,
      banned: true,
    },
  },
} satisfies Prisma.ApplicationMemberSelect;

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

function generateApplicationSubject() {
  return randomBytes(32).toString("base64url");
}

function normalizeMemberStatus(status?: string) {
  const normalized = status ?? "active";

  if (!allowedMemberStatuses.has(normalized)) {
    throw new ApplicationsPolicyError("Invalid application member status");
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
  _count?: { clients: number; members: number };
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
    memberCount: row._count?.members ?? 0,
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

function mapMember(row: {
  id: string;
  applicationId: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    archived: boolean;
    banned: boolean;
  };
}) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    userId: row.userId,
    status: row.status,
    user: row.user,
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

function applyLifecycleFilter(
  where: Prisma.ApplicationWhereInput | Prisma.ApplicationClientWhereInput,
  filter?: "current" | "archived",
) {
  if (filter === "archived") {
    where.status = "archived";
    return;
  }

  if (filter === "current") {
    where.status = { in: ["active", "disabled"] };
  }
}

function applyMemberFilter(
  where: Prisma.ApplicationMemberWhereInput,
  filter?: "current" | "revoked",
) {
  if (filter === "revoked") {
    where.status = "revoked";
    return;
  }

  if (filter === "current") {
    where.status = { in: ["active", "suspended"] };
  }
}

function normalizeClientUrls(input: {
  redirectUris?: string[];
  allowedOrigins?: string[];
}) {
  try {
    return {
      redirectUris: input.redirectUris
        ? normalizeRedirectUris(input.redirectUris)
        : undefined,
      allowedOrigins: input.allowedOrigins
        ? normalizeOrigins(input.allowedOrigins)
        : undefined,
    };
  } catch (error) {
    if (error instanceof ApplicationUrlValidationError) {
      throw new ApplicationsPolicyError(error.message);
    }
    throw error;
  }
}

export class AdminApplicationsService {
  async list(query: ApplicationsQuery) {
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.ApplicationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    } else {
      applyLifecycleFilter(where, query.filter);
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
      select: applicationSelect,
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

  async getById(id: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      select: applicationSelect,
    });

    if (!application) {
      throw new ApplicationsPolicyError("Application not found", 404);
    }

    return mapApplication(application);
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

  async update(
    id: string,
    input: UpdateApplicationInput,
    actor: AdminApplicationsActor,
  ) {
    const data: Prisma.ApplicationUpdateInput = {};

    if (input.slug !== undefined) {
      data.slug = normalizeSlug(input.slug);
    }
    if (input.name !== undefined) {
      data.name = input.name.trim();
    }
    if (input.description !== undefined) {
      data.description = input.description.trim() || null;
    }
    if (input.status !== undefined) {
      data.status = normalizeStatus(input.status);
    }
    if (input.logoUrl !== undefined) {
      data.logoUrl = input.logoUrl;
    }
    if (input.homepageUrl !== undefined) {
      data.homepageUrl = input.homepageUrl;
    }

    const application = await prisma.application.update({
      where: { id },
      data,
      select: applicationSelect,
    });

    await recordApplicationActivity({
      type: "application.updated",
      actorUserId: actor.id ?? null,
      message: `Application updated: ${application.name}`,
      metadata: { applicationId: application.id, slug: application.slug },
    });

    return mapApplication(application);
  }

  async archive(id: string, actor: AdminApplicationsActor) {
    return this.setApplicationStatus(id, "archived", actor, "application.archived");
  }

  async restore(id: string, actor: AdminApplicationsActor) {
    return this.setApplicationStatus(id, "active", actor, "application.restored");
  }

  private async setApplicationStatus(
    id: string,
    status: "active" | "archived",
    actor: AdminApplicationsActor,
    type: string,
  ) {
    const application = await prisma.application.update({
      where: { id },
      data: { status },
      select: applicationSelect,
    });

    await recordApplicationActivity({
      type,
      actorUserId: actor.id ?? null,
      message: `Application ${status === "archived" ? "archived" : "restored"}: ${application.name}`,
      metadata: { applicationId: application.id, slug: application.slug },
    });

    return mapApplication(application);
  }

  async deletePermanent(id: string, actor: AdminApplicationsActor) {
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        _count: { select: { clients: true } },
      },
    });

    if (!application) {
      throw new ApplicationsPolicyError("Application not found", 404);
    }

    if (application.status !== "archived") {
      throw new ApplicationsPolicyError(
        "Only archived applications can be permanently deleted",
      );
    }

    if (application._count.clients > 0) {
      throw new ApplicationsPolicyError(
        "Delete or archive clients before permanently deleting this application",
      );
    }

    await prisma.application.delete({ where: { id } });

    await recordApplicationActivity({
      type: "application.deleted",
      actorUserId: actor.id ?? null,
      message: `Application permanently deleted: ${application.name}`,
      metadata: { applicationId: application.id, slug: application.slug },
    });

    return { id: application.id, deleted: true };
  }

  async listClients(applicationId: string, query: ClientsQuery = {}) {
    const where: Prisma.ApplicationClientWhereInput = { applicationId };
    applyLifecycleFilter(where, query.filter);

    const rows = await prisma.applicationClient.findMany({
      where,
      select: clientSelect,
      orderBy: { createdAt: "desc" },
    });

    return {
      items: rows.map(mapClient),
    };
  }

  async listMembers(applicationId: string, query: ApplicationMembersQuery = {}) {
    const { requestedPage, limit } = normalizePagination(query.page, query.limit);
    const where: Prisma.ApplicationMemberWhereInput = { applicationId };
    applyMemberFilter(where, query.filter);

    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const total = await prisma.applicationMember.count({ where });
    const pages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.applicationMember.findMany({
      where,
      select: memberSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows.map(mapMember),
      total,
      pages,
      page,
      limit,
    };
  }

  async grantMember(
    applicationId: string,
    input: CreateApplicationMemberInput,
    actor: AdminApplicationsActor,
  ) {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, name: true },
    });

    if (!application) {
      throw new ApplicationsPolicyError("Application not found", 404);
    }

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        email: true,
        archived: true,
      },
    });

    if (!user || user.archived) {
      throw new ApplicationsPolicyError("User not found", 404);
    }

    try {
      const member = await prisma.$transaction(async (tx) => {
        await tx.applicationSubject.upsert({
          where: {
            applicationId_userId: { applicationId, userId: user.id },
          },
          create: {
            applicationId,
            userId: user.id,
            subject: generateApplicationSubject(),
          },
          update: {},
        });

        return tx.applicationMember.create({
          data: {
            applicationId,
            userId: user.id,
            status: normalizeMemberStatus(),
          },
          select: memberSelect,
        });
      });

      await recordApplicationActivity({
        type: "application_member.granted",
        actorUserId: actor.id ?? null,
        message: `Application access granted: ${user.email}`,
        metadata: {
          applicationId,
          memberId: member.id,
          userId: user.id,
        },
      });

      return mapMember(member);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ApplicationsPolicyError(
          "User already has access to this application",
        );
      }

      throw error;
    }
  }

  async suspendMember(
    applicationId: string,
    memberId: string,
    actor: AdminApplicationsActor,
  ) {
    return this.setMemberStatus(
      applicationId,
      memberId,
      "suspended",
      actor,
      "application_member.suspended",
    );
  }

  async restoreMember(
    applicationId: string,
    memberId: string,
    actor: AdminApplicationsActor,
  ) {
    return this.setMemberStatus(
      applicationId,
      memberId,
      "active",
      actor,
      "application_member.restored",
    );
  }

  async revokeMember(
    applicationId: string,
    memberId: string,
    actor: AdminApplicationsActor,
  ) {
    return this.setMemberStatus(
      applicationId,
      memberId,
      "revoked",
      actor,
      "application_member.revoked",
    );
  }

  private async setMemberStatus(
    applicationId: string,
    id: string,
    status: "active" | "suspended" | "revoked",
    actor: AdminApplicationsActor,
    type: string,
  ) {
    const member = await prisma.applicationMember.update({
      where: { id, applicationId },
      data: { status },
      select: memberSelect,
    });

    await recordApplicationActivity({
      type,
      actorUserId: actor.id ?? null,
      message: `Application access ${status}: ${member.user.email}`,
      metadata: {
        applicationId,
        memberId: member.id,
        userId: member.userId,
      },
    });

    return mapMember(member);
  }

  async deleteMemberPermanent(
    applicationId: string,
    id: string,
    actor: AdminApplicationsActor,
  ) {
    const member = await prisma.applicationMember.findUnique({
      where: { id, applicationId },
      select: {
        id: true,
        applicationId: true,
        userId: true,
        status: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!member) {
      throw new ApplicationsPolicyError("Application member not found", 404);
    }

    if (member.status !== "revoked") {
      throw new ApplicationsPolicyError(
        "Only revoked application memberships can be permanently deleted",
      );
    }

    await prisma.applicationMember.delete({
      where: { id, applicationId },
    });

    await recordApplicationActivity({
      type: "application_member.deleted",
      actorUserId: actor.id ?? null,
      message: `Application access permanently deleted: ${member.user.email}`,
      metadata: {
        applicationId,
        memberId: member.id,
        userId: member.userId,
      },
    });

    return { id: member.id, deleted: true };
  }

  async canUserAccessApplication(userId: string, applicationId: string) {
    const member = await prisma.applicationMember.findFirst({
      where: {
        applicationId,
        userId,
        status: "active",
        application: {
          status: "active",
        },
      },
      select: { id: true },
    });

    return Boolean(member);
  }

  async createClient(
    applicationId: string,
    input: CreateApplicationClientInput,
    actor: AdminApplicationsActor,
  ) {
    const { redirectUris, allowedOrigins } = normalizeClientUrls({
      redirectUris: input.redirectUris,
      allowedOrigins: input.allowedOrigins ?? [],
    });
    const status = normalizeStatus(input.status);

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
        status,
        oauthDisabled: status !== "active",
        skipConsent: true,
        enableEndSession: false,
        scopes: ["openid"],
        tokenEndpointAuthMethod: "none",
        grantTypes: ["authorization_code"],
        responseTypes: ["code"],
        public: true,
        metadata: { applicationId },
        redirectUris: redirectUris ?? [],
        allowedOrigins: allowedOrigins ?? [],
      },
      select: clientSelect,
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

  async updateClient(
    applicationId: string,
    clientId: string,
    input: UpdateApplicationClientInput,
    actor: AdminApplicationsActor,
  ) {
    const { redirectUris, allowedOrigins } = normalizeClientUrls(input);
    const data: Prisma.ApplicationClientUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name.trim();
    }
    if (input.clientType !== undefined) {
      data.clientType = input.clientType.trim() || "public";
    }
    if (input.status !== undefined) {
      const status = normalizeStatus(input.status);
      data.status = status;
      data.oauthDisabled = status !== "active";
    }
    if (redirectUris !== undefined) {
      data.redirectUris = redirectUris;
    }
    if (allowedOrigins !== undefined) {
      data.allowedOrigins = allowedOrigins;
    }

    const client = await prisma.applicationClient.update({
      where: { id: clientId, applicationId },
      data,
      select: clientSelect,
    });

    await recordApplicationActivity({
      type: "application_client.updated",
      actorUserId: actor.id ?? null,
      message: `Application client updated: ${client.name}`,
      metadata: { applicationId, clientId: client.clientId },
    });

    return mapClient(client);
  }

  async archiveClient(
    applicationId: string,
    clientId: string,
    actor: AdminApplicationsActor,
  ) {
    return this.setClientStatus(
      applicationId,
      clientId,
      "archived",
      actor,
      "application_client.archived",
    );
  }

  async restoreClient(
    applicationId: string,
    clientId: string,
    actor: AdminApplicationsActor,
  ) {
    return this.setClientStatus(
      applicationId,
      clientId,
      "active",
      actor,
      "application_client.restored",
    );
  }

  private async setClientStatus(
    applicationId: string,
    id: string,
    status: "active" | "archived",
    actor: AdminApplicationsActor,
    type: string,
  ) {
    const client = await prisma.applicationClient.update({
      where: { id, applicationId },
      data: { status, oauthDisabled: status !== "active" },
      select: clientSelect,
    });

    await recordApplicationActivity({
      type,
      actorUserId: actor.id ?? null,
      message: `Application client ${status === "archived" ? "archived" : "restored"}: ${client.name}`,
      metadata: { applicationId, clientId: client.clientId },
    });

    return mapClient(client);
  }

  async deleteClientPermanent(
    applicationId: string,
    id: string,
    actor: AdminApplicationsActor,
  ) {
    const client = await prisma.applicationClient.findUnique({
      where: { id, applicationId },
      select: {
        id: true,
        applicationId: true,
        clientId: true,
        name: true,
        status: true,
      },
    });

    if (!client) {
      throw new ApplicationsPolicyError("Application client not found", 404);
    }

    if (client.status !== "archived") {
      throw new ApplicationsPolicyError(
        "Only archived clients can be permanently deleted",
      );
    }

    await prisma.applicationClient.delete({
      where: { id, applicationId },
    });

    await recordApplicationActivity({
      type: "application_client.deleted",
      actorUserId: actor.id ?? null,
      message: `Application client permanently deleted: ${client.name}`,
      metadata: { applicationId, clientId: client.clientId },
    });

    return { id: client.id, deleted: true };
  }
}

export const adminApplicationsService = new AdminApplicationsService();

export function canUserAccessApplication(
  userId: string,
  applicationId: string,
) {
  return adminApplicationsService.canUserAccessApplication(userId, applicationId);
}
