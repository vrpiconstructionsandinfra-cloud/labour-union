import { Router } from "express";

import {
  createAttendance,
  getAllAttendance,
  getWorkerAttendance,
  updateAttendance,
  deleteAttendance,
  handleCheckIn,
  handleCheckOut,
  getTodayAttendanceStatus,
  verifyFacePhotos,
} from "../controllers/attendance.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

// Authenticate all attendance routes
router.use(authenticate);

// DeepFace Python Face Verification
router.post("/verify-faces", verifyFacePhotos);

// Agent Check In / Check Out routes
router.post("/check-in", handleCheckIn);
router.post("/check-out", handleCheckOut);
router.get("/today-status", getTodayAttendanceStatus);

/*
 * Super Agent & Agent can mark attendance
 */
router.post(
  "/",
  authorize("SUPER_AGENT", "AGENT", "CUSTOMER_SUPPORT"),
  createAttendance
);

/*
 * Super Agent & Agent can view all attendance
 */
router.get(
  "/",
  authorize("SUPER_AGENT", "AGENT", "WORKER", "CUSTOMER_SUPPORT"),
  getAllAttendance
);

/*
 * Super Agent, Agent & Worker can view worker attendance
 */
router.get(
  "/:workerId",
  authorize("SUPER_AGENT", "AGENT", "WORKER", "CUSTOMER_SUPPORT"),
  getWorkerAttendance
);

/*
 * Super Agent & Agent can update attendance
 */
router.put(
  "/:id",
  authorize("SUPER_AGENT", "AGENT", "CUSTOMER_SUPPORT"),
  updateAttendance
);

/*
 * Only Super Agent can delete attendance
 */
router.delete(
  "/:id",
  authorize("SUPER_AGENT"),
  deleteAttendance
);

export default router;