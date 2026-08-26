import { Request, Response } from "express";
import * as notificationService from "../services/notification.service";
import { triggerSaturdayAuditNotification } from "../services/scheduler.service";
import { UserRole } from "@prisma/client";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    const notifications = await notificationService.getUserNotifications(userId, role);
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch notifications",
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const updated = await notificationService.markNotificationRead(notificationId);
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    await notificationService.markAllNotificationsRead(userId, role);
    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type, targetRole, targetUserId } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    let role: UserRole | undefined = undefined;
    if (targetRole && targetRole !== "ALL") {
      role = targetRole as UserRole;
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
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create notification",
    });
  }
};

export const triggerSaturdayAudit = async (req: Request, res: Response) => {
  try {
    const notification = await triggerSaturdayAuditNotification();
    res.status(200).json({
      success: true,
      message: "Saturday Weekly Audit Excel Report notification triggered successfully",
      data: notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to trigger Saturday audit notification",
    });
  }
};

export const clearAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role as UserRole;
    await notificationService.clearAllUserNotifications(userId, role);
    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear notifications",
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    await notificationService.deleteUserNotification(notificationId);
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete notification",
    });
  }
};
