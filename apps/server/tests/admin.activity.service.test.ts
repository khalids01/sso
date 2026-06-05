import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const activityCreateMock = mock(async (args?: unknown) => args);
const activityCountMock = mock(async () => 0);
const activityFindManyMock = mock(async (): Promise<any> => []);

mock.module("@db/server", () => ({
  default: {
    activityEvent: {
      create: activityCreateMock,
      count: activityCountMock,
      findMany: activityFindManyMock,
    },
  },
  Prisma,
}));

beforeEach(() => {
  activityCreateMock.mockImplementation(async (args?: unknown) => args);
  activityCountMock.mockResolvedValue(0);
  activityFindManyMock.mockResolvedValue([]);
});

afterEach(() => {
  activityCreateMock.mockReset();
  activityCountMock.mockReset();
  activityFindManyMock.mockReset();
});

const safeActivityUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  rbacRoles: {
    take: 1,
    select: {
      role: {
        select: {
          slug: true,
        },
      },
    },
  },
};

describe("ActivityService", () => {
  it("records activity with safe defaults", async () => {
    const { activityService } = await import(
      "../src/modules/admin/activity/activity.service"
    );

    await activityService.record({
      type: "user.invited",
      actorUserId: "admin-1",
      message: "new@example.com was invited as USER",
      metadata: {
        email: "new@example.com",
        role: "USER",
      },
    });

    expect(activityCreateMock).toHaveBeenCalledWith({
      data: {
        type: "user.invited",
        actorUserId: "admin-1",
        targetUserId: null,
        visitorId: null,
        severity: "info",
        message: "new@example.com was invited as USER",
        metadata: {
          email: "new@example.com",
          role: "USER",
        },
      },
    });
  });

  it("lists newest events first with safe user projections", async () => {
    activityCountMock.mockResolvedValueOnce(1);
    activityFindManyMock.mockResolvedValueOnce([
      {
        id: "activity-1",
        type: "user.banned",
        actorUserId: "admin-1",
        targetUserId: "user-1",
        visitorId: null,
        severity: "warning",
        message: "User One was banned",
        metadata: { email: "user@example.com" },
        createdAt: new Date("2026-04-25T12:00:00.000Z"),
        actorUser: {
          id: "admin-1",
          name: "Admin",
          email: "admin@example.com",
          image: null,
          rbacRoles: [{ role: { slug: "platform.admin" } }],
        },
        targetUser: {
          id: "user-1",
          name: "User One",
          email: "user@example.com",
          image: null,
          rbacRoles: [{ role: { slug: "platform.user" } }],
        },
      },
    ]);

    const { activityService } = await import(
      "../src/modules/admin/activity/activity.service"
    );

    const result = await activityService.list({ page: 1, limit: 20 });

    expect(activityFindManyMock).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        type: true,
        actorUserId: true,
        targetUserId: true,
        visitorId: true,
        severity: true,
        message: true,
        metadata: true,
        createdAt: true,
        actorUser: { select: safeActivityUserSelect },
        targetUser: { select: safeActivityUserSelect },
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
    expect(result.items[0]).toMatchObject({
      id: "activity-1",
      createdAt: "2026-04-25T12:00:00.000Z",
      actorUser: {
        email: "admin@example.com",
        role: "platform.admin",
      },
      targetUser: {
        email: "user@example.com",
        role: "platform.user",
      },
    });
  });

  it("filters by type and severity", async () => {
    const { activityService } = await import(
      "../src/modules/admin/activity/activity.service"
    );

    await activityService.list({
      page: 1,
      limit: 20,
      type: "feedback.submitted",
      severity: "warning",
    });

    expect(activityCountMock).toHaveBeenCalledWith({
      where: {
        type: "feedback.submitted",
        severity: "warning",
      },
    });
  });

  it("clamps pagination limit and bounds high pages", async () => {
    activityCountMock.mockResolvedValueOnce(5);

    const { activityService } = await import(
      "../src/modules/admin/activity/activity.service"
    );

    const result = await activityService.list({ page: 999, limit: 1000 });

    expect(activityFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 100,
      }),
    );
    expect(result).toMatchObject({
      total: 5,
      pages: 1,
      page: 1,
      limit: 100,
    });
  });
});
