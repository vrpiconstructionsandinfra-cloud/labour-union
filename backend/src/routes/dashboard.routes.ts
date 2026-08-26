import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { UserRole } from "@prisma/client";

const router = Router();

// Allow authenticated users (SUPER_AGENT, AGENT, WORKER) to view dashboard statistics
router.get(
  "/",
  authenticate,
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER, UserRole.CUSTOMER_SUPPORT),
  getDashboardStats
);

export default router;