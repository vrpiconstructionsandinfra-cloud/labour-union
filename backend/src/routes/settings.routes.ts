import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { getWageConfig, updateWageConfig } from "../controllers/settings.controller";

const router = Router();

// Get wage configuration (Available to all authenticated roles or public fallback)
router.get("/wage-config", getWageConfig);

// Update wage configuration (Super Admin ONLY)
router.put(
  "/wage-config",
  authenticate,
  authorize("SUPER_AGENT"),
  updateWageConfig
);

// POST alias for update
router.post(
  "/wage-config",
  authenticate,
  authorize("SUPER_AGENT"),
  updateWageConfig
);

export default router;
