import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

import {
  findAll,
  findOne,
  update,
  remove,
  workers,
  agents,
  getPublicWorker
} from "../controllers/user.controller";

import { UserRole } from "@prisma/client";

const router = Router();

// Public route for QR Code scanner verification (Unauthenticated)
router.get("/public/:id", getPublicWorker);

router.use(authenticate);

// Get all users
router.get(
  "/",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  findAll
);

// Get all workers
router.get(
  "/workers",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  workers
);

// Get all agents
router.get(
  "/agents",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  agents
);

// Get user by ID
router.get(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  findOne
);

// Update user
router.put(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  update
);

// Delete user
router.delete(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  remove
);

export default router;