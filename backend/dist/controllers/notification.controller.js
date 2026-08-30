"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.clearAllNotifications = exports.triggerSaturdayAudit = exports.createNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const notificationService = __importStar(require("../services/notification.service"));
const scheduler_service_1 = require("../services/scheduler.service");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const notifications = await notificationService.getUserNotifications(userId, role);
        res.status(200).json({
            success: true,
            data: notifications,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch notifications",
        });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);
        const updated = await notificationService.markNotificationRead(notificationId);
        res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to mark notification as read",
        });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        await notificationService.markAllNotificationsRead(userId, role);
        res.status(200).json({
            success: true,
            message: "All notifications marked as read",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to mark all notifications as read",
        });
    }
};
exports.markAllAsRead = markAllAsRead;
const createNotification = async (req, res) => {
    try {
        const { title, message, type, targetRole, targetUserId } = req.body;
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Title and message are required",
            });
        }
        let role = undefined;
        if (targetRole && targetRole !== "ALL") {
            role = targetRole;
        }
        const userId = targetUserId ? Number(targetUserId) : undefined;
        const notification = await notificationService.createNotification({
            title,
            message,
            type: type || "ANNOUNCEMENT",
            role,
            userId,
        });
        res.status(201).json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to create notification",
        });
    }
};
exports.createNotification = createNotification;
const triggerSaturdayAudit = async (req, res) => {
    try {
        const notification = await (0, scheduler_service_1.triggerSaturdayAuditNotification)();
        res.status(200).json({
            success: true,
            message: "Saturday Weekly Audit Excel Report notification triggered successfully",
            data: notification,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to trigger Saturday audit notification",
        });
    }
};
exports.triggerSaturdayAudit = triggerSaturdayAudit;
const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        await notificationService.clearAllUserNotifications(userId, role);
        res.status(200).json({
            success: true,
            message: "All notifications cleared successfully",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to clear notifications",
        });
    }
};
exports.clearAllNotifications = clearAllNotifications;
const deleteNotification = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);
        await notificationService.deleteUserNotification(notificationId);
        res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to delete notification",
        });
    }
};
exports.deleteNotification = deleteNotification;
