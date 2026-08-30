"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserNotification = exports.clearAllUserNotifications = exports.markAllNotificationsRead = exports.markNotificationRead = exports.getUserNotifications = exports.createNotification = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const socket_1 = require("../socket/socket");
const createNotification = async (data) => {
    const notification = await prisma_1.default.notification.create({
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
        const io = (0, socket_1.getSocketIO)();
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
        }
        else if (data.role) {
            io.to(`role:${data.role}`).emit("notification", payload);
        }
        else {
            io.emit("notification", payload);
        }
    }
    catch (err) {
        // Socket initialization might be delayed in some envs
        console.error("[Notification Service] Socket emit skipped:", err.message);
    }
    return notification;
};
exports.createNotification = createNotification;
const getUserNotifications = async (userId, role) => {
    return await prisma_1.default.notification.findMany({
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
exports.getUserNotifications = getUserNotifications;
const markNotificationRead = async (notificationId) => {
    return await prisma_1.default.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
    });
};
exports.markNotificationRead = markNotificationRead;
const markAllNotificationsRead = async (userId, role) => {
    return await prisma_1.default.notification.updateMany({
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
exports.markAllNotificationsRead = markAllNotificationsRead;
const clearAllUserNotifications = async (userId, role) => {
    return await prisma_1.default.notification.deleteMany({
        where: {
            OR: [
                { userId: userId },
                { role: role },
                { userId: null, role: null },
            ],
        },
    });
};
exports.clearAllUserNotifications = clearAllUserNotifications;
const deleteUserNotification = async (notificationId) => {
    return await prisma_1.default.notification.delete({
        where: { id: notificationId },
    });
};
exports.deleteUserNotification = deleteUserNotification;
