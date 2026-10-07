import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

import * as siteController from "../controllers/site.controller";

const router = Router();

// Create Site
router.post(
  "/",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  siteController.create
);

// Get All Sites
router.get(
  "/",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT", "ADMIN"),
  siteController.findAll
);

// Get Site By Id
router.get(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT", "ADMIN"),
  siteController.findOne
);

// Update Site
router.put(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "AGENT", "ADMIN"),
  siteController.update
);

// Assign Site to Admin
router.post(
  "/:id/assign-admin",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  siteController.assignAdmin
);

// Delete Site
router.delete(
  "/:id",
  authenticate,
  authorize("SUPER_AGENT", "CUSTOMER_SUPPORT", "ADMIN"),
  siteController.remove
);

export default router;