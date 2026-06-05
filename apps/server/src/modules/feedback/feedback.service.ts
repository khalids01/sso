import prisma from "@db/server";
import { Roles } from "@rbac";
import { notificationsService } from "../notifications/notifications.service";
import { activityService } from "../admin/activity/activity.service";
import type { FeedbackQuery } from "./feedback.dto";

export const feedbackService = {
    async submitFeedback(userId: string, message: string, severity: string) {
        const feedback = await prisma.feedback.create({
            data: {
                userId,
                message,
                severity,
            },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Get all admins and owners
        const admins = await prisma.user.findMany({
            where: {
                rbacRoles: {
                    some: {
                        role: {
                            slug: {
                                in: [Roles.PlatformAdmin, Roles.PlatformOwner],
                            },
                        },
                    },
                },
            },
            select: { id: true },
        });

        // Create notifications for them
        for (const admin of admins) {
            await notificationsService.create(
                admin.id,
                "New Feedback Received",
                `New ${severity} severity feedback from ${feedback.user.name}: ${message.substring(0, 50)}...`,
                "/admin/feedback"
            );
        }

        await activityService.record({
            type: "feedback.submitted",
            actorUserId: userId,
            targetUserId: userId,
            severity: severity === "high" ? "warning" : "info",
            message: `${feedback.user.name} submitted ${severity} feedback`,
            metadata: {
                feedbackId: feedback.id,
                severity,
            },
        });

        return feedback;
    },

    async getAllFeedback(query: FeedbackQuery = {}) {
        const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
        const requestedPage = Math.max(query.page ?? 1, 1);

        const [items, total] = await Promise.all([
            prisma.feedback.findMany({
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
                skip: (requestedPage - 1) * limit,
                take: limit,
            }),
            prisma.feedback.count(),
        ]);

        const pages = Math.max(1, Math.ceil(total / limit));
        const page = Math.min(requestedPage, pages);

        return {
            items,
            total,
            pages,
            page,
            limit,
        };
    },

    async updateFeedbackStatus(id: string, status: string, actorUserId?: string) {
        const feedback = await prisma.feedback.update({
            where: { id },
            data: { status },
        });

        await activityService.record({
            type: "feedback.status_updated",
            actorUserId,
            targetUserId: feedback.userId,
            message: `Feedback status changed to ${status}`,
            metadata: {
                feedbackId: id,
                status,
            },
        });

        return feedback;
    },
};
