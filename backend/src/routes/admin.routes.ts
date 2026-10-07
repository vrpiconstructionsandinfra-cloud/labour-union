import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.use(authenticate);

// ─── Admin Portal Specific Endpoints ──────────────────────────────────────────
// Portal dashboard: Available for ADMIN role (their own) or SUPER_AGENT (with ?adminId=X)
router.get(
  "/portal/dashboard",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.getAdminPortalDashboard
);

// Admin creates a field agent under their supervision
router.post(
  "/portal/create-agent",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.createAgentUnderAdmin
);

// Admin deletes an agent under their supervision
router.delete(
  "/portal/agents/:agentId",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.deleteAgentUnderAdmin
);

// Admin monitors workers and attendance under a particular agent
router.get(
  "/portal/agent/:agentId/workers",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.getAgentWorkersUnderAdmin
);

// ─── Super Admin Controls Over Admins ─────────────────────────────────────────
// List all administrators
router.get(
  "/",
  authorize(UserRole.SUPER_AGENT),
  adminController.getAdmins
);

// Create new administrator
router.post(
  "/",
  authorize(UserRole.SUPER_AGENT),
  adminController.createAdmin
);

// Get single admin detail with agents and workers
router.get(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.getAdmin
);

// Update administrator
router.put(
  "/:id",
  authorize(UserRole.SUPER_AGENT, UserRole.ADMIN),
  adminController.updateAdmin
);

// Delete administrator
router.delete(
  "/:id",
  authorize(UserRole.SUPER_AGENT),
  adminController.deleteAdmin
);

// Assign agents to administrator
router.post(
  "/:id/assign-agents",
  authorize(UserRole.SUPER_AGENT),
  adminController.assignAgents
);

// Remove agent from administrator
router.delete(
  "/:id/agents/:agentId",
  authorize(UserRole.SUPER_AGENT),
  adminController.removeAgent
);

export default router;
