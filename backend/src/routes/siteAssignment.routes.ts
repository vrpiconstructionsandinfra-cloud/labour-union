import { Router } from "express";

import {
  assignWorker,
  removeWorker,
  getSiteWorkers,
  getWorkerSite,
} from "../controllers/siteAssignment.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

/*
 Assign worker to site
*/
router.post(
  "/assign",
  authenticate,
  authorize("SUPER_AGENT"),
  assignWorker
);

/*
 Remove worker from site
*/
router.patch(
  "/remove/:workerId",
  authenticate,
  authorize("SUPER_AGENT"),
  removeWorker
);

/*
 Get all workers in a site
*/
router.get(
  "/:siteId/workers",
  authenticate,
  authorize("SUPER_AGENT", "AGENT"),
  getSiteWorkers
);

/*
 Get a worker's assigned site
*/
router.get(
  "/worker/:workerId",
  authenticate,
  authorize("SUPER_AGENT", "AGENT", "WORKER"),
  getWorkerSite
);

export default router;