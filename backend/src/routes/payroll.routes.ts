import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";

import {
  generatePayroll,
  getPayrolls,
  getPayrollById,
} from "../controllers/payroll.controller";

const router = Router();

router.use(authenticate);

/*
 * Generate payroll
 */
router.post(
  "/",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  generatePayroll
);

/*
 * View all payrolls
 */
router.get(
  "/",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  getPayrolls
);

/*
 * View payroll by ID
 */
router.get(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  getPayrollById
);

export default router;