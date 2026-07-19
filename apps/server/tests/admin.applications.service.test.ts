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
  signInMethods: args.data.signInMethods,
  signUpMethods: args.data.signUpMethods,
  registrationMode: args.data.registrationMode,
  passwordEmailVerificationRequired:
    args.data.passwordEmailVerificationRequired,
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
  signInMethods: args.data.signInMethods ?? ["magic_link", "password"],
  signUpMethods: args.data.signUpMethods ?? ["magic_link"],
  registrationMode: args.data.registrationMode ?? "closed",
  passwordEmailVerificationRequired:
    args.data.passwordEmailVerificationRequired ?? true,
  createdAt: new Date("2026-07-10T08:00:00.000Z"),
  updatedAt: new Date("2026-07-10T08:10:00.000Z"),
  _count: { clients: 0, members: 0 },
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
const applicationMemberCountMock = mock(async () => 0);
const applicationMemberFindManyMock = mock(async (): Promise<any> => []);
const applicationMemberCreateMock = mock(async (args: any) => ({
  id: "member-1",
  applicationId: args.data.applicationId,
  userId: args.data.userId,
  status: args.data.status,
  createdAt: new Date("2026-07-10T08:04:00.000Z"),
  updatedAt: new Date("2026-07-10T08:05:00.000Z"),
  user: {
    id: args.data.userId,
    name: "Khalid",
    email: "khalid@example.com",
    image: null,
    archived: false,
    banned: false,
  },
}));
const applicationMemberUpdateMock = mock(async (args: any) => ({
  id: args.where.id,
  applicationId: args.where.applicationId,
  userId: "user-1",
  status: args.data.status,
  authorizationVersion: args.data.authorizationVersion ? 2 : 1,
  createdAt: new Date("2026-07-10T08:04:00.000Z"),
  updatedAt: new Date("2026-07-10T08:12:00.000Z"),
  user: {
    id: "user-1",
    name: "Khalid",
    email: "khalid@example.com",
    image: null,
    archived: false,
    banned: false,
  },
}));
const applicationMemberFindUniqueMock = mock(async () => ({
  id: "member-1",
  applicationId: "app-1",
  userId: "user-1",
  status: "revoked",
  user: {
    email: "khalid@example.com",
  },
}));
const applicationMemberFindFirstMock = mock(async () => ({ id: "member-1" }));
const applicationMemberUpdateManyMock = mock(async () => ({ count: 0 }));
const applicationMemberDeleteMock = mock(async () => null);
const applicationSubjectUpsertMock = mock(async () => ({ id: "subject-1" }));
const applicationSubjectFindUniqueOrThrowMock = mock(async () => ({ subject: "pairwise-subject" }));
const revocationEndpointFindFirstMock = mock(async () => null);
const revocationDeliveryCreateMock = mock(async () => ({ id: "delivery-1" }));
const userFindUniqueMock = mock(async () => ({
  id: "user-1",
  name: "Khalid",
  email: "khalid@example.com",
  archived: false,
}));
const activityEventCreateMock = mock(async () => null);

const dbMock: any = {
    application: {
      count: applicationCountMock,
      findMany: applicationFindManyMock,
      create: applicationCreateMock,
      findUnique: applicationFindUniqueMock,
      findUniqueOrThrow: applicationFindUniqueMock,
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
    applicationMember: {
      count: applicationMemberCountMock,
      findMany: applicationMemberFindManyMock,
      create: applicationMemberCreateMock,
      update: applicationMemberUpdateMock,
      updateMany: applicationMemberUpdateManyMock,
      findUnique: applicationMemberFindUniqueMock,
      findFirst: applicationMemberFindFirstMock,
      delete: applicationMemberDeleteMock,
    },
    applicationSubject: {
      upsert: applicationSubjectUpsertMock,
      findUniqueOrThrow: applicationSubjectFindUniqueOrThrowMock,
    },
    applicationRevocationEndpoint: {
      findFirst: revocationEndpointFindFirstMock,
    },
    applicationRevocationDelivery: {
      create: revocationDeliveryCreateMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    activityEvent: {
      create: activityEventCreateMock,
    },
};
dbMock.$transaction = mock(async (callback: (tx: typeof dbMock) => unknown) =>
  callback(dbMock),
);

mock.module("@db/server", () => ({
  default: dbMock,
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
    applicationMemberCountMock.mockReset();
    applicationMemberFindManyMock.mockReset();
    applicationMemberCreateMock.mockReset();
    applicationMemberUpdateMock.mockClear();
    applicationMemberFindUniqueMock.mockReset();
    applicationMemberFindFirstMock.mockReset();
    applicationMemberUpdateManyMock.mockClear();
    applicationMemberDeleteMock.mockClear();
    applicationSubjectUpsertMock.mockClear();
    applicationSubjectFindUniqueOrThrowMock.mockClear();
    revocationEndpointFindFirstMock.mockReset();
    revocationEndpointFindFirstMock.mockResolvedValue(null);
    userFindUniqueMock.mockReset();
    activityEventCreateMock.mockClear();
    applicationCountMock.mockResolvedValue(0);
    applicationFindManyMock.mockResolvedValue([]);
    applicationFindUniqueMock.mockResolvedValue({
      id: "app-1",
      name: "Dashboard",
      status: "active",
      signInMethods: ["magic_link", "password"],
      signUpMethods: ["magic_link"],
    });
    applicationClientFindUniqueMock.mockResolvedValue({
      id: "client-1",
      applicationId: "app-1",
      clientId: "sso_client_1",
      name: "Browser client",
      status: "archived",
    });
    applicationMemberCountMock.mockResolvedValue(0);
    applicationMemberFindManyMock.mockResolvedValue([]);
    applicationMemberCreateMock.mockImplementation(async (args: any) => ({
      id: "member-1",
      applicationId: args.data.applicationId,
      userId: args.data.userId,
      status: args.data.status,
      authorizationVersion: 1,
      createdAt: new Date("2026-07-10T08:04:00.000Z"),
      updatedAt: new Date("2026-07-10T08:05:00.000Z"),
      user: {
        id: args.data.userId,
        name: "Khalid",
        email: "khalid@example.com",
        image: null,
        archived: false,
        banned: false,
      },
    }));
    applicationMemberFindUniqueMock.mockResolvedValue({
      id: "member-1",
      applicationId: "app-1",
      userId: "user-1",
      status: "revoked",
      authorizationVersion: 1,
      user: {
        email: "khalid@example.com",
      },
    });
    applicationMemberFindFirstMock.mockResolvedValue({ id: "member-1" });
    userFindUniqueMock.mockResolvedValue({
      id: "user-1",
      name: "Khalid",
      email: "khalid@example.com",
      archived: false,
    });
  });

  it("lists applications newest first with client and member counts", async () => {
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
        signInMethods: ["magic_link", "password"],
        signUpMethods: ["magic_link"],
        registrationMode: "closed",
        passwordEmailVerificationRequired: true,
        createdAt: new Date("2026-07-10T08:00:00.000Z"),
        updatedAt: new Date("2026-07-10T08:01:00.000Z"),
        _count: { clients: 2, members: 3 },
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
        signInMethods: true,
        signUpMethods: true,
        registrationMode: true,
        passwordEmailVerificationRequired: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clients: true,
            members: true,
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
      memberCount: 3,
      createdAt: "2026-07-10T08:00:00.000Z",
    });
  });

  it("gets an application by id with relation counts", async () => {
    applicationFindUniqueMock.mockResolvedValueOnce({
      id: "app-1",
      slug: "dashboard",
      name: "Dashboard",
      description: null,
      status: "active",
      logoUrl: null,
      homepageUrl: null,
      signInMethods: ["magic_link", "password"],
      signUpMethods: ["magic_link"],
      registrationMode: "closed",
      passwordEmailVerificationRequired: true,
      createdAt: new Date("2026-07-10T08:00:00.000Z"),
      updatedAt: new Date("2026-07-10T08:01:00.000Z"),
      _count: { clients: 2, members: 3 },
    });

    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    const result = await adminApplicationsService.getById("app-1");

    expect(applicationFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "app-1" },
      select: expect.objectContaining({
        _count: { select: { clients: true, members: true } },
      }),
    });
    expect(result).toMatchObject({
      id: "app-1",
      clientCount: 2,
      memberCount: 3,
    });
  });

  it("returns not found when getting an unknown application", async () => {
    applicationFindUniqueMock.mockResolvedValueOnce(null);

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(adminApplicationsService.getById("missing")).rejects.toMatchObject({
      name: ApplicationsPolicyError.name,
      status: 404,
      message: "Application not found",
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

  it("requires every signup method to also be enabled for sign-in", async () => {
    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.update(
        "app-1",
        { signInMethods: ["password"], signUpMethods: ["magic_link"] },
        { id: "owner-1" },
      ),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
    expect(applicationUpdateMock).not.toHaveBeenCalled();
  });

  it("stores separate application sign-in and registration settings", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.update(
      "app-1",
      {
        signInMethods: ["magic_link", "password"],
        signUpMethods: ["magic_link", "password"],
        registrationMode: "invite_only",
        passwordEmailVerificationRequired: false,
      },
      { id: "owner-1" },
    );

    expect(applicationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signInMethods: ["magic_link", "password"],
          signUpMethods: ["magic_link", "password"],
          registrationMode: "invite_only",
          passwordEmailVerificationRequired: false,
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
          oauthDisabled: false,
          skipConsent: true,
          scopes: ["openid"],
          tokenEndpointAuthMethod: "none",
          grantTypes: ["authorization_code"],
          responseTypes: ["code"],
          public: true,
          metadata: { applicationId: "app-1" },
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
          oauthDisabled: true,
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
      expect.objectContaining({
        data: { status: "archived", oauthDisabled: true },
      }),
    );
    expect(applicationClientUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "active", oauthDisabled: false },
      }),
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

  it("grants application access to an existing user", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    const result = await adminApplicationsService.grantMember(
      "app-1",
      { userId: "user-1" },
      { id: "owner-1" },
    );

    expect(userFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        id: true,
        name: true,
        email: true,
        archived: true,
      },
    });
    expect(applicationMemberCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          applicationId: "app-1",
          userId: "user-1",
          status: "active",
        },
      }),
    );
    expect(result).toMatchObject({
      id: "member-1",
      status: "active",
      user: { email: "khalid@example.com" },
    });
    expect(activityEventCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "application_member.granted",
          actorUserId: "owner-1",
        }),
      }),
    );
  });

  it("rejects duplicate application access grants", async () => {
    applicationMemberCreateMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.grantMember(
        "app-1",
        { userId: "user-1" },
        { id: "owner-1" },
      ),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
  });

  it("lists current members as active and suspended", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.listMembers("app-1", {
      page: 1,
      limit: 20,
      filter: "current",
    });

    expect(applicationMemberFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          applicationId: "app-1",
          status: { in: ["active", "suspended"] },
        },
      }),
    );
  });

  it("lists revoked members separately", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.listMembers("app-1", {
      page: 1,
      limit: 20,
      filter: "revoked",
    });

    expect(applicationMemberFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          applicationId: "app-1",
          status: "revoked",
        },
      }),
    );
  });

  it("suspends, restores, and revokes application access", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.suspendMember("app-1", "member-1", {
      id: "owner-1",
    });
    await adminApplicationsService.restoreMember("app-1", "member-1", {
      id: "owner-1",
    });
    await adminApplicationsService.revokeMember("app-1", "member-1", {
      id: "owner-1",
    });

    expect(applicationMemberUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "suspended" }) }),
    );
    expect(applicationMemberUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
    expect(applicationMemberUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "revoked" }) }),
    );
  });

  it("permanently deletes revoked application memberships", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await adminApplicationsService.deleteMemberPermanent(
      "app-1",
      "member-1",
      { id: "owner-1" },
    );

    expect(applicationMemberDeleteMock).toHaveBeenCalledWith({
      where: { id: "member-1", applicationId: "app-1" },
    });
  });

  it("rejects permanent member delete for non-revoked records", async () => {
    applicationMemberFindUniqueMock.mockResolvedValueOnce({
      id: "member-1",
      applicationId: "app-1",
      userId: "user-1",
      status: "active",
      user: {
        email: "khalid@example.com",
      },
    });

    const { adminApplicationsService, ApplicationsPolicyError } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.deleteMemberPermanent(
        "app-1",
        "member-1",
        { id: "owner-1" },
      ),
    ).rejects.toBeInstanceOf(ApplicationsPolicyError);
    expect(applicationMemberDeleteMock).not.toHaveBeenCalled();
  });

  it("checks active application access for active members", async () => {
    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.canUserAccessApplication("user-1", "app-1"),
    ).resolves.toBe(true);
    expect(applicationMemberFindFirstMock).toHaveBeenCalledWith({
      where: {
        applicationId: "app-1",
        userId: "user-1",
        status: "active",
        application: {
          status: "active",
        },
      },
      select: { id: true },
    });
  });

  it("denies access when membership or application is not active", async () => {
    applicationMemberFindFirstMock.mockResolvedValueOnce(null);

    const { adminApplicationsService } = await import(
      "../src/modules/admin/applications/applications.service"
    );

    await expect(
      adminApplicationsService.canUserAccessApplication("user-1", "app-1"),
    ).resolves.toBe(false);
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
