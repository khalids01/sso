import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const applicationCountMock = mock(async () => 0);
const applicationFindManyMock = mock(async (): Promise<any> => []);
const applicationCreateMock = mock(async (args: any) => ({
  id: "app-1",
  slug: args.data.slug,
  name: args.data.name,
  description: args.data.description,
  status: args.data.status,
  logoUrl: args.data.logoUrl,
  homepageUrl: args.data.homepageUrl,
  createdAt: new Date("2026-07-10T08:00:00.000Z"),
  updatedAt: new Date("2026-07-10T08:01:00.000Z"),
}));
const applicationFindUniqueMock = mock(async () => ({
  id: "app-1",
  name: "Dashboard",
}));
const applicationUpdateMock = mock(async (args: any) => ({
  id: args.where.id,
  slug: args.data.slug ?? "dashboard",
  name: args.data.name ?? "Dashboard",
  description: args.data.description ?? null,
  status: args.data.status ?? "active",
  logoUrl: args.data.logoUrl ?? null,
  homepageUrl: args.data.homepageUrl ?? null,
  createdAt: new Date("2026-07-10T08:00:00.000Z"),
  updatedAt: new Date("2026-07-10T08:10:00.000Z"),
  _count: { clients: 0 },
}));
const applicationDeleteMock = mock(async () => null);
const applicationClientFindManyMock = mock(async (): Promise<any> => []);
const applicationClientCreateMock = mock(async (args: any) => ({
  id: "client-1",
  applicationId: args.data.applicationId,
  clientId: args.data.clientId,
  name: args.data.name,
  clientType: args.data.clientType,
  status: args.data.status,
  redirectUris: args.data.redirectUris,
  allowedOrigins: args.data.allowedOrigins,
  createdAt: new Date("2026-07-10T08:02:00.000Z"),
  updatedAt: new Date("2026-07-10T08:03:00.000Z"),
}));
const applicationClientFindUniqueMock = mock(async () => ({
  id: "client-1",
  applicationId: "app-1",
  clientId: "sso_client_1",
  name: "Browser client",
  status: "archived",
}));
const applicationClientUpdateMock = mock(async (args: any) => ({
  id: args.where.id,
  applicationId: args.where.applicationId,
  clientId: "sso_client_1",
  name: args.data.name ?? "Browser client",
  clientType: args.data.clientType ?? "public",
  status: args.data.status ?? "active",
  redirectUris: args.data.redirectUris ?? ["https://app.example.com/callback"],
  allowedOrigins: args.data.allowedOrigins ?? ["https://app.example.com"],
  createdAt: new Date("2026-07-10T08:02:00.000Z"),
  updatedAt: new Date("2026-07-10T08:11:00.000Z"),
}));
const applicationClientDeleteMock = mock(async () => null);
const activityEventCreateMock = mock(async () => null);

mock.module("@db/server", () => ({
  default: {
    application: {
      count: applicationCountMock,
      findMany: applicationFindManyMock,
      create: applicationCreateMock,
      findUnique: applicationFindUniqueMock,
      update: applicationUpdateMock,
      delete: applicationDeleteMock,
    },
    applicationClient: {
      findMany: applicationClientFindManyMock,
      create: applicationClientCreateMock,
      findUnique: applicationClientFindUniqueMock,
      update: applicationClientUpdateMock,
      delete: applicationClientDeleteMock,
    },
    activityEvent: {
      create: activityEventCreateMock,
    },
  },
  Prisma,
}));

describe("AdminApplicationsService", () => {
  afterAll(() => {
    mock.restore();
  });

  beforeEach(() => {
    applicationCountMock.mockReset();
    applicationFindManyMock.mockReset();
    applicationCreateMock.mockClear();
    applicationFindUniqueMock.mockReset();
    applicationUpdateMock.mockClear();
    applicationDeleteMock.mockClear();
    applicationClientFindManyMock.mockReset();
    applicationClientCreateMock.mockClear();
    applicationClientFindUniqueMock.mockReset();
    applicationClientUpdateMock.mockClear();
    applicationClientDeleteMock.mockClear();
    activityEventCreateMock.mockClear();
    applicationCountMock.mockResolvedValue(0);
    applicationFindManyMock.mockResolvedValue([]);
    applicationFindUniqueMock.mockResolvedValue({
      id: "app-1",
      name: "Dashboard",
    });
    applicationClientFindUniqueMock.mockResolvedValue({
      id: "client-1",
      applicationId: "app-1",
      clientId: "sso_client_1",
      name: "Browser client",
      status: "archived",
    });
  });

  it("lists applications newest first with client counts", async () => {
    applicationCountMock.mockResolvedValueOnce(1);
    applicationFindManyMock.mockResolvedValueOnce([
      {
        id: "app-1",
        slug: "dashboard",
        name: "Dashboard",
        description: null,
        status: "active",
        logoUrl: null,
        homepageUrl: null,
        createdAt: new Date("2026-07-10T08:00:00.000Z"),
        updatedAt: new Date("2026-07-10T08:01:00.000Z"),
        _count: { clients: 2 },
      },
    ]);

    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    const result = await adminApplicationsService.list({ page: 1, limit: 20 });

    expect(applicationFindManyMock).toHaveBeenCalledWith({
      where: {},
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
      skip: 0,
      take: 20,
    });
    expect(result.items[0]).toMatchObject({
      slug: "dashboard",
      clientCount: 2,
      createdAt: "2026-07-10T08:00:00.000Z",
    });
  });

  it("creates an application with normalized slug and default status", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    const result = await adminApplicationsService.create(
      {
        name: "Customer Dashboard",
        description: " Main app ",
      },
      { id: "owner-1" },
    );

    expect(applicationCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "customer-dashboard",
          name: "Customer Dashboard",
          description: "Main app",
          status: "active",
        }),
      }),
    );
    expect(activityEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "application.created",
          actorUserId: "owner-1",
        }),
      }),
    );
    expect(result).toMatchObject({
      slug: "customer-dashboard",
      status: "active",
    });
  });

  it("lists current applications as active and disabled", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.list({ page: 1, limit: 20, filter: "current" });

    expect(applicationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: ["active", "disabled"] },
        },
      }),
    );
  });

  it("lists archived applications separately", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.list({ page: 1, limit: 20, filter: "archived" });

    expect(applicationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "archived",
        },
      }),
    );
  });

  it("updates application fields", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.update(
      "app-1",
      {
        name: "Dashboard Plus",
        slug: "Dashboard Plus",
        status: "disabled",
      },
      { id: "owner-1" },
    );

    expect(applicationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1" },
        data: expect.objectContaining({
          name: "Dashboard Plus",
          slug: "dashboard-plus",
          status: "disabled",
        }),
      }),
    );
    expect(activityEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "application.updated",
        }),
      }),
    );
  });

  it("archives and restores an application", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.archive("app-1", { id: "owner-1" });
    await adminApplicationsService.restore("app-1", { id: "owner-1" });

    expect(applicationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "archived" },
      }),
    );
    expect(applicationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "active" },
      }),
    );
  });

  it("blocks permanent application delete when clients exist", async () => {
    applicationFindUniqueMock.mockResolvedValueOnce({
      id: "app-1",
      slug: "dashboard",
      name: "Dashboard",
      status: "archived",
      _count: { clients: 1 },
    });

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.deletePermanent("app-1", { id: "owner-1" }),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
    expect(applicationDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects permanent application delete for non-archived records", async () => {
    applicationFindUniqueMock.mockResolvedValueOnce({
      id: "app-1",
      slug: "dashboard",
      name: "Dashboard",
      status: "active",
      _count: { clients: 0 },
    });

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.deletePermanent("app-1", { id: "owner-1" }),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
  });

  it("creates a client with generated client id and normalized URLs", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    const result = await adminApplicationsService.createClient(
      "app-1",
      {
        name: "Browser client",
        redirectUris: [
          "https://app.example.com/callback",
          "https://app.example.com/callback",
        ],
        allowedOrigins: ["https://app.example.com/path"],
      },
      { id: "owner-1" },
    );

    expect(applicationClientCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: "app-1",
          clientId: expect.stringMatching(/^sso_client_[a-f0-9]{32}$/),
          clientType: "public",
          status: "active",
          redirectUris: ["https://app.example.com/callback"],
          allowedOrigins: ["https://app.example.com"],
        }),
      }),
    );
    expect(result.clientId).toMatch(/^sso_client_[a-f0-9]{32}$/);
    expect(activityEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "application_client.created",
          actorUserId: "owner-1",
        }),
      }),
    );
  });

  it("updates client fields and normalizes URLs", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.updateClient(
      "app-1",
      "client-1",
      {
        name: "Updated client",
        status: "disabled",
        redirectUris: ["https://app.example.com/next"],
        allowedOrigins: ["https://app.example.com/path"],
      },
      { id: "owner-1" },
    );

    expect(applicationClientUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "client-1", applicationId: "app-1" },
        data: expect.objectContaining({
          name: "Updated client",
          status: "disabled",
          redirectUris: ["https://app.example.com/next"],
          allowedOrigins: ["https://app.example.com"],
        }),
      }),
    );
  });

  it("archives and restores a client", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.archiveClient("app-1", "client-1", {
      id: "owner-1",
    });
    await adminApplicationsService.restoreClient("app-1", "client-1", {
      id: "owner-1",
    });

    expect(applicationClientUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "archived" } }),
    );
    expect(applicationClientUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "active" } }),
    );
  });

  it("permanently deletes archived clients", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.deleteClientPermanent(
      "app-1",
      "client-1",
      { id: "owner-1" },
    );

    expect(applicationClientDeleteMock).toHaveBeenCalledWith({
      where: { id: "client-1", applicationId: "app-1" },
    });
  });

  it("rejects permanent client delete for non-archived records", async () => {
    applicationClientFindUniqueMock.mockResolvedValueOnce({
      id: "client-1",
      applicationId: "app-1",
      clientId: "sso_client_1",
      name: "Browser client",
      status: "active",
    });

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.deleteClientPermanent("app-1", "client-1", {
        id: "owner-1",
      }),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
    expect(applicationClientDeleteMock).not.toHaveBeenCalled();
  });

  it("rejects invalid redirect URI input", async () => {
    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.createClient(
        "app-1",
        {
          name: "Bad client",
          redirectUris: ["ftp://app.example.com/callback"],
        },
        { id: "owner-1" },
      ),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
    expect(applicationClientCreateMock).not.toHaveBeenCalled();
  });
});
