import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import { getSocketIO } from "../socket/socket";

export const createNotification = async (data: {
  userId?: number;
  role?: UserRole;
  title: string;
  message: string;
  type?: string;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId || null,
      role: data.role || null,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
      isRead: false,
    },
  });

  // Emit socket event for real-time sync
  try {
    const io = getSocketIO();
    const payload = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      userId: notification.userId,
      role: notification.role,
    };

    if (data.userId) {
      io.to(`user:${data.userId}`).emit("notification", payload);
    } else if (data.role) {
      io.to(`role:${data.role}`).emit("notification", payload);
    } else {
      io.emit("notification", payload);
    }
  } catch (err) {
    // Socket initialization might be delayed in some envs
    console.error("[Notification Service] Socket emit skipped:", (err as Error).message);
  }

  return notification;
};

export const getUserNotifications = async (userId: number, role: UserRole) => {
  return await prisma.notification.findMany({
    where: {
      OR: [
        { userId: userId },
        { role: role },
        { userId: null, role: null },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
};

export const markNotificationRead = async (notificationId: number) => {
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

export const markAllNotificationsRead = async (userId: number, role: UserRole) => {
  return await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        { userId: userId },
        { role: role },
        { userId: null, role: null },
      ],
    },
    data: { isRead: true },
  });
};

export const clearAllUserNotifications = async (userId: number, role: UserRole) => {
  return await prisma.notification.deleteMany({
    where: {
      OR: [
        { userId: userId },
        { role: role },
        { userId: null, role: null },
      ],
    },
  });
};

export const deleteUserNotification = async (notificationId: number) => {
  return await prisma.notification.delete({
    where: { id: notificationId },
  });
};
