import prisma, { Prisma } from "@sso/db/server";
import {
  decryptSocialProviderSecret,
  encryptSocialProviderSecret,
} from "../../auth/social-provider-credentials.service";
import type {
  CreateOAuthConnectionInput,
  OAuthConnectionsQuery,
  OAuthProviderId,
  UpdateOAuthConnectionInput,
} from "./oauth-connections.dto";

const connectionSelect = {
  id: true,
  name: true,
  provider: true,
  clientId: true,
  credentialVersion: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      applicationAssignments: true,
      accounts: true,
    },
  },
} satisfies Prisma.OAuthProviderConnectionSelect;

export type OAuthConnectionsActor = { id?: string };

export class OAuthConnectionsPolicyError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OAuthConnectionsPolicyError";
  }
}

function normalizeText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new OAuthConnectionsPolicyError(`${label} is required`);
  }
  return normalized;
}

function mapConnection(
  connection: Prisma.OAuthProviderConnectionGetPayload<{
    select: typeof connectionSelect;
  }>,
) {
  return {
    id: connection.id,
    name: connection.name,
    provider: connection.provider as OAuthProviderId,
    clientId: connection.clientId,
    credentialVersion: connection.credentialVersion,
    status: connection.status,
    applicationCount: connection._count.applicationAssignments,
    accountCount: connection._count.accounts,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

function mapUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== "P2002") return null;
  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target ?? "");
  return target.includes("clientId")
    ? "This provider client ID is already registered"
    : "A connection with this name already exists for this provider";
}

async function recordActivity(input: {
  type: string;
  actorUserId?: string;
  connectionId: string;
  provider: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activityEvent.create({
    data: {
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      message: input.message,
      metadata: {
        oauthProviderConnectionId: input.connectionId,
        provider: input.provider,
        ...input.metadata,
      },
    },
  });
}

export class OAuthConnectionsService {
  async list(query: OAuthConnectionsQuery) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const requestedPage = Math.max(query.page ?? 1, 1);
    const where: Prisma.OAuthProviderConnectionWhereInput = {
      status:
        query.filter === "archived"
          ? "archived"
          : { not: "archived" },
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: "insensitive" } },
              {
                clientId: {
                  contains: query.search.trim(),
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
    const total = await prisma.oAuthProviderConnection.count({ where });
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(requestedPage, pages);
    const rows = await prisma.oAuthProviderConnection.findMany({
      where,
      select: connectionSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items: rows.map(mapConnection), total, pages, page, limit };
  }

  async options() {
    const rows = await prisma.oAuthProviderConnection.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        provider: true,
        status: true,
      },
      orderBy: [{ provider: "asc" }, { name: "asc" }],
    });
    return {
      items: rows.map((row) => ({
        ...row,
        provider: row.provider as OAuthProviderId,
      })),
    };
  }

  async getById(id: string) {
    const connection = await prisma.oAuthProviderConnection.findUnique({
      where: { id },
      select: connectionSelect,
    });
    if (!connection) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    return mapConnection(connection);
  }

  async create(
    input: CreateOAuthConnectionInput,
    actor: OAuthConnectionsActor,
  ) {
    try {
      const connection = await prisma.oAuthProviderConnection.create({
        data: {
          name: normalizeText(input.name, "Connection name"),
          provider: input.provider,
          clientId: normalizeText(input.clientId, "Client ID"),
          encryptedSecret: encryptSocialProviderSecret(
            normalizeText(input.clientSecret, "Client secret"),
          ),
          status: input.status ?? "active",
        },
        select: connectionSelect,
      });
      await recordActivity({
        type: "oauth_connection.created",
        actorUserId: actor.id,
        connectionId: connection.id,
        provider: connection.provider,
        message: `OAuth connection created: ${connection.name}`,
      });
      return mapConnection(connection);
    } catch (error) {
      const message = mapUniqueError(error);
      if (message) throw new OAuthConnectionsPolicyError(message, 409);
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateOAuthConnectionInput,
    actor: OAuthConnectionsActor,
  ) {
    const current = await prisma.oAuthProviderConnection.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        provider: true,
        clientId: true,
        status: true,
      },
    });
    if (!current) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    if (current.status === "archived") {
      throw new OAuthConnectionsPolicyError(
        "Restore this OAuth connection before editing it",
      );
    }
    const nextClientId =
      input.clientId !== undefined
        ? normalizeText(input.clientId, "Client ID")
        : undefined;
    const credentialsChanged =
      (nextClientId !== undefined && nextClientId !== current.clientId) ||
      input.clientSecret !== undefined;
    try {
      const connection = await prisma.oAuthProviderConnection.update({
        where: { id },
        data: {
          ...(input.name !== undefined
            ? { name: normalizeText(input.name, "Connection name") }
            : {}),
          ...(input.clientId !== undefined
            ? { clientId: nextClientId }
            : {}),
          ...(input.clientSecret !== undefined
            ? {
                encryptedSecret: encryptSocialProviderSecret(
                  normalizeText(input.clientSecret, "Client secret"),
                ),
              }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(credentialsChanged
            ? { credentialVersion: { increment: 1 } }
            : {}),
        },
        select: connectionSelect,
      });
      await recordActivity({
        type: "oauth_connection.updated",
        actorUserId: actor.id,
        connectionId: connection.id,
        provider: connection.provider,
        message: `OAuth connection updated: ${connection.name}`,
        metadata: {
          changedFields: Object.entries(input)
            .filter(([, value]) => value !== undefined)
            .map(([key]) => key),
          credentialVersion: connection.credentialVersion,
          credentialsChanged,
        },
      });
      return mapConnection(connection);
    } catch (error) {
      const message = mapUniqueError(error);
      if (message) throw new OAuthConnectionsPolicyError(message, 409);
      throw error;
    }
  }

  async revealSecret(id: string, actor: OAuthConnectionsActor) {
    const connection = await prisma.oAuthProviderConnection.findUnique({
      where: { id },
      select: { id: true, name: true, provider: true, encryptedSecret: true },
    });
    if (!connection) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    await recordActivity({
      type: "oauth_connection.secret_revealed",
      actorUserId: actor.id,
      connectionId: connection.id,
      provider: connection.provider,
      message: `OAuth connection secret revealed: ${connection.name}`,
      metadata: { operation: "secret_reveal" },
    });
    return {
      clientSecret: decryptSocialProviderSecret(connection.encryptedSecret),
    };
  }

  async archive(id: string, actor: OAuthConnectionsActor) {
    const connection = await prisma.oAuthProviderConnection.update({
      where: { id },
      data: { status: "archived" },
      select: connectionSelect,
    }).catch(() => null);
    if (!connection) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    await recordActivity({
      type: "oauth_connection.archived",
      actorUserId: actor.id,
      connectionId: connection.id,
      provider: connection.provider,
      message: `OAuth connection archived: ${connection.name}`,
    });
    return mapConnection(connection);
  }

  async restore(id: string, actor: OAuthConnectionsActor) {
    const connection = await prisma.oAuthProviderConnection.update({
      where: { id },
      data: { status: "active" },
      select: connectionSelect,
    }).catch(() => null);
    if (!connection) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    await recordActivity({
      type: "oauth_connection.restored",
      actorUserId: actor.id,
      connectionId: connection.id,
      provider: connection.provider,
      message: `OAuth connection restored: ${connection.name}`,
    });
    return mapConnection(connection);
  }

  async deletePermanent(id: string, actor: OAuthConnectionsActor) {
    const connection = await prisma.oAuthProviderConnection.findUnique({
      where: { id },
      select: connectionSelect,
    });
    if (!connection) {
      throw new OAuthConnectionsPolicyError("OAuth connection not found", 404);
    }
    if (connection.status !== "archived") {
      throw new OAuthConnectionsPolicyError(
        "Only archived OAuth connections can be permanently deleted",
      );
    }
    if (
      connection._count.applicationAssignments > 0 ||
      connection._count.accounts > 0
    ) {
      throw new OAuthConnectionsPolicyError(
        "Remove all application assignments and linked accounts before deleting this connection",
      );
    }
    await prisma.oAuthProviderConnection.delete({ where: { id } });
    await recordActivity({
      type: "oauth_connection.deleted",
      actorUserId: actor.id,
      connectionId: connection.id,
      provider: connection.provider,
      message: `OAuth connection permanently deleted: ${connection.name}`,
    });
    return { success: true };
  }
}

export const oauthConnectionsService = new OAuthConnectionsService();
