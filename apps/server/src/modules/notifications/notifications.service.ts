import prisma from "@db/server";

export class NotificationsService {
  async getForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.update({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async create(userId: string, title: string, message: string, url?: string) {
    return prisma.notification.create({
      data: { userId, title, message, url },
    });
  }

  async broadcast(title: string, message: string, url?: string) {
    const users = await prisma.user.findMany({ select: { id: true } });
    return prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title, message, url })),
    });
  }
}

export const notificationsService = new NotificationsService();
