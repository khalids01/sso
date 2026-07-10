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
const activityEventCreateMock = mock(async () => null);

mock.module("@db/server", () => ({
  default: {
    application: {
      count: applicationCountMock,
      findMany: applicationFindManyMock,
      create: applicationCreateMock,
      findUnique: applicationFindUniqueMock,
    },
    applicationClient: {
      findMany: applicationClientFindManyMock,
      create: applicationClientCreateMock,
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
    applicationClientFindManyMock.mockReset();
    applicationClientCreateMock.mockClear();
    activityEventCreateMock.mockClear();
    applicationCountMock.mockResolvedValue(0);
    applicationFindManyMock.mockResolvedValue([]);
    applicationFindUniqueMock.mockResolvedValue({
      id: "app-1",
      name: "Dashboard",
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
