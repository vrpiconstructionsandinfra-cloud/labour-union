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
 * Super Agent
 */
router.post(
  "/",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT"),
  createInsurance
);

router.get(
  "/",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT", "WORKER"),
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
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getWorkerInsurance
);

router.patch(
  "/:id",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT"),
  updateInsurance
);

router.delete(
  "/:id",
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT"),
  deleteInsurance
);

export default router;