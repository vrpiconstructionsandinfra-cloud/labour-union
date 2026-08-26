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
  authorize("SUPER_AGENT", "AGENT"),
  createInsurance
);

router.get(
  "/",
  authorize("SUPER_AGENT", "AGENT", "WORKER"),
  getAllInsurance
);

/*
 * Worker
 */
router.get(
  "/my",
  authorize("WORKER"),
  getMyInsurance
);

/*
 * Super Agent
 */
router.get(
  "/:workerId",
  authorize("SUPER_AGENT"),
  getWorkerInsurance
);

router.patch(
  "/:id",
  authorize("SUPER_AGENT", "AGENT"),
  updateInsurance
);

router.delete(
  "/:id",
  authorize("SUPER_AGENT", "AGENT"),
  deleteInsurance
);

export default router;