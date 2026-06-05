import { afterEach, describe, expect, it, mock } from "bun:test";
import { Prisma } from "../../../packages/db/prisma/generated/client";

const feedbackFindManyMock = mock(async (): Promise<any> => []);
const feedbackCountMock = mock(async () => 0);
const feedbackCreateMock = mock(async () => ({
  id: "feedback-1",
  user: { name: "User" },
}));
const feedbackUpdateMock = mock(async (): Promise<any> => null);
const userFindManyMock = mock(async (): Promise<any> => []);
const activityRecordMock = mock(async () => null);

mock.module("@db/server", () => ({
  default: {
    feedback: {
      findMany: feedbackFindManyMock,
      count: feedbackCountMock,
      create: feedbackCreateMock,
      update: feedbackUpdateMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
  Prisma,
}));

mock.module("../src/modules/notifications/notifications.service", () => ({
  notificationsService: {
    create: mock(async () => undefined),
  },
}));

mock.module("../src/modules/admin/activity/activity.service", () => ({
  activityService: {
    record: activityRecordMock,
  },
}));

afterEach(() => {
  feedbackFindManyMock.mockReset();
  feedbackCountMock.mockReset();
  feedbackCreateMock.mockReset();
  feedbackUpdateMock.mockReset();
  userFindManyMock.mockReset();
  activityRecordMock.mockReset();
});

describe("feedbackService", () => {
  it("returns paginated feedback with metadata", async () => {
    feedbackFindManyMock.mockResolvedValueOnce([
      {
        id: "feedback-1",
        message: "Test feedback",
        severity: "high",
        status: "open",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        user: {
          name: "User One",
          email: "user@example.com",
          image: null,
        },
      },
    ]);
    feedbackCountMock.mockResolvedValueOnce(25);

    const { feedbackService } = await import("../src/modules/feedback/feedback.service");
    const result = await feedbackService.getAllFeedback({ page: 2, limit: 10 });

    expect(feedbackFindManyMock).toHaveBeenCalledWith({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: 10,
      take: 10,
    });
    expect(result).toMatchObject({
      total: 25,
      pages: 3,
      page: 2,
      limit: 10,
    });
  });

  it("bounds feedback page size", async () => {
    feedbackCountMock.mockResolvedValueOnce(1);
    feedbackFindManyMock.mockResolvedValueOnce([]);

    const { feedbackService } = await import("../src/modules/feedback/feedback.service");
    const result = await feedbackService.getAllFeedback({ page: -1, limit: 1000 });

    expect(feedbackFindManyMock).toHaveBeenCalledWith({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: 0,
      take: 100,
    });
    expect(result).toMatchObject({
      total: 1,
      pages: 1,
      page: 1,
      limit: 100,
    });
  });

  it("records submitted feedback without storing the message body", async () => {
    feedbackCreateMock.mockResolvedValueOnce({
      id: "feedback-1",
      user: { name: "User One" },
    });
    userFindManyMock.mockResolvedValueOnce([{ id: "admin-1" }]);

    const { feedbackService } = await import("../src/modules/feedback/feedback.service");

    await feedbackService.submitFeedback("user-1", "private message body", "high");

    expect(activityRecordMock).toHaveBeenCalledWith({
      type: "feedback.submitted",
      actorUserId: "user-1",
      targetUserId: "user-1",
      severity: "warning",
      message: "User One submitted high feedback",
      metadata: {
        feedbackId: "feedback-1",
        severity: "high",
      },
    });
  });

  it("records feedback status updates", async () => {
    feedbackUpdateMock.mockResolvedValueOnce({
      id: "feedback-1",
      userId: "user-1",
      status: "closed",
    });

    const { feedbackService } = await import("../src/modules/feedback/feedback.service");

    await feedbackService.updateFeedbackStatus("feedback-1", "closed", "admin-1");

    expect(activityRecordMock).toHaveBeenCalledWith({
      type: "feedback.status_updated",
      actorUserId: "admin-1",
      targetUserId: "user-1",
      message: "Feedback status changed to closed",
      metadata: {
        feedbackId: "feedback-1",
        status: "closed",
      },
    });
  });
});
