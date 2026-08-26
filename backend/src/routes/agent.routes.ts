import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

import {
  assignWorker,
  removeWorker,
  workersByAgent,
  workerAgent,
} from "../controllers/agent.controller";

import { UserRole } from "@prisma/client";


const router = Router();


router.use(authenticate);


/*
 Assign worker to agent

 POST /api/agents/assign
*/
router.post(
  "/assign",
  authorize(UserRole.AGENT),
  assignWorker
);



/*
 Remove worker from agent

 DELETE /api/agents/remove/:workerId
*/
router.delete(
  "/remove/:workerId",
  authorize(UserRole.AGENT),
  removeWorker
);



/*
 Get workers under agent

 GET /api/agents/:agentId/workers
*/
router.get(
  "/:agentId/workers",
  authorize(
    UserRole.SUPER_AGENT,
    UserRole.AGENT
  ),
  workersByAgent
);



/*
 Get worker assigned agent

 GET /api/agents/worker/:workerId
*/
router.get(
  "/worker/:workerId",
  authorize(
    UserRole.SUPER_AGENT,
    UserRole.AGENT,
    UserRole.WORKER
  ),
  workerAgent
);


export default router;