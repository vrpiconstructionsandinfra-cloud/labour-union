import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

import * as siteController from "../controllers/site.controller";

const router = Router();

// Create Site
router.post(
  "/",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT"),
  siteController.create
);

// Get All Sites
router.get(
  "/",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT"),
  siteController.findAll
);

// Get Site By Id
router.get(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT"),
  siteController.findOne
);

// Update Site
router.put(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT"),
  siteController.update
);

// Delete Site
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT"),
  siteController.remove
);

export default router;