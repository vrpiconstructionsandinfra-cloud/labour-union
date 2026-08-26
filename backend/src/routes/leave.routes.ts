import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";

import {
  applyLeave,
  getMyLeaves,
  getPendingLeaves,
  approveLeave,
  rejectLeave,
  getAllLeaves,
} from "../controllers/leave.controller";

const router = Router();

router.use(authenticate);

/*
 * Apply Leave (Worker, Agent, Super Agent)
 */
router.post(
  "/",
  authorize(UserRole.WORKER, UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  applyLeave
);

/*
 * Get My Leaves (Only logged-in worker's leaves)
 */
router.get(
  "/my",
  authorize(UserRole.WORKER, UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  getMyLeaves
);

/*
 * Agent & Super Agent Routes (Pending, Approve, Reject)
 */
router.get(
  "/pending",
  authorize(UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  getPendingLeaves
);

router.put(
  "/:id/approve",
  authorize(UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  approveLeave
);

router.put(
  "/:id/reject",
  authorize(UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  rejectLeave
);

/*
 * View All Leaves (Strictly AGENT & SUPER_AGENT permission only)
 */
router.get(
  "/",
  authorize(UserRole.AGENT, UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  getAllLeaves
);

export default router;