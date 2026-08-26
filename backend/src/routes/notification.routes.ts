import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  triggerSaturdayAudit,
  clearAllNotifications,
  deleteNotification
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/clear-all", clearAllNotifications);
router.delete("/:id", deleteNotification);

router.post(
  "/trigger-saturday-audit",
  authorize(UserRole.SUPER_AGENT),
  triggerSaturdayAudit
);

router.post(
  "/",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  createNotification
);

export default router;
