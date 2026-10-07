import { Router } from "express";

import {
  createInsurance,
  getAllInsurance,
  getMyInsurance,
  getWorkerInsurance,
  updateInsurance,
  deleteInsurance,
} from "../controllers/insurance.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

/*
 * Super Agent, Admin & Customer Support
 */
router.post(
  "/",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  createInsurance
);

router.get(
  "/",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN", "AGENT", "WORKER"),
  getAllInsurance
);

/*
 * Worker
 */
router.get(
  "/my",
  authorize("WORKER", "AGENT"),
  getMyInsurance
);

/*
 * Super Agent & Customer Support
 */
router.get(
  "/:workerId",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  getWorkerInsurance
);

router.patch(
  "/:id",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  updateInsurance
);

router.delete(
  "/:id",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  deleteInsurance
);

export default router;