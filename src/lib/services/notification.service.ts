import { getPrisma } from "@/lib/prisma";
import { notification_type } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: notification_type;
  referenceId: string;
  content?: string;
  triggeredById?: string; // The user who triggered the action (to prevent self-notification)
}

export class NotificationService {
  private static DEBOUNCE_MINUTES = 5;

  /**
   * Creates a notification with debounce and self-action check.
   */
  static async createNotification({
    userId,
    type,
    referenceId,
    content,
    triggeredById,
  }: CreateNotificationParams) {
    // 1. User tự thực hiện action -> không tạo notification cho chính mình
    if (triggeredById && userId === triggeredById) {
      return null;
    }

    const prisma = getPrisma();

    // 2. Kiểm tra user tồn tại và không bị remove (Workspace check skipped here, normally handled by caller)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return null;

    // 3. Debounce logic: Tránh duplicate notification cùng type + reference_id + user_id trong thời gian ngắn
    // Riêng TaskDueSoon: Chỉ gửi 1 lần duy nhất cho mỗi task (không giới hạn thời gian debounce ngắn)
    const debounceTime = type === "TaskDueSoon" 
      ? 24 * 60 * 60 * 1000 // 24 hours for due soon
      : this.DEBOUNCE_MINUTES * 60 * 1000;

    const recentNotification = await prisma.notification.findFirst({
      where: {
        user_id: userId,
        type: type,
        reference_id: referenceId,
        created_at: {
          gte: new Date(Date.now() - debounceTime),
        },
      },
    });

    if (recentNotification) {
      return null;
    }

    // 4. Create notification
    try {
      const notification = await prisma.notification.create({
        data: {
          user_id: userId,
          type: type,
          reference_id: referenceId,
          content: content,
        },
      });
      return notification;
    } catch (error) {
      console.error("Failed to create notification:", error);
      return null; // API fail -> không được ảnh hưởng flow chính
    }
  }

  /**
   * Marks a notification as read.
   */
  static async markAsRead(notificationId: string, userId: string) {
    const prisma = getPrisma();
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        read_at: new Date(),
      },
    });
  }

  /**
   * Marks a notification as unread.
   */
  static async markAsUnread(notificationId: string, userId: string) {
    const prisma = getPrisma();
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        user_id: userId,
      },
      data: {
        read_at: null,
      },
    });
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    const prisma = getPrisma();
    return await prisma.notification.updateMany({
      where: {
        user_id: userId,
        read_at: null,
      },
      data: {
        read_at: new Date(),
      },
    });
  }

  /**
   * Gets unread count for a user.
   */
  static async getUnreadCount(userId: string) {
    const prisma = getPrisma();
    return await prisma.notification.count({
      where: {
        user_id: userId,
        read_at: null,
      },
    });
  }

  /**
   * Lists notifications for a user with pagination.
   */
  static async listNotifications(userId: string, limit = 30, offset = 0) {
    const prisma = getPrisma();
    return await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    });
  }
}
