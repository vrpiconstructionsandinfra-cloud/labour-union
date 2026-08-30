import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";
import {
  submitEnquiry,
  getEnquiries,
  updateStatus,
  removeEnquiry,
} from "../controllers/enquiry.controller";

const router = Router();

// Public route: Submit enquiry
router.post("/", submitEnquiry);

// Protected routes (Super Agent / Admin only)
router.use(authenticate);
router.use(authorize(UserRole.SUPER_AGENT));

router.get("/", getEnquiries);
router.patch("/:id/status", updateStatus);
router.delete("/:id", removeEnquiry);

export default router;
