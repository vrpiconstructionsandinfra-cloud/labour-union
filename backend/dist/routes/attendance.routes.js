"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
// Authenticate all attendance routes
router.use(auth_middleware_1.authenticate);
// DeepFace Python Face Verification
router.post("/verify-faces", attendance_controller_1.verifyFacePhotos);
// Agent Check In / Check Out routes
router.post("/check-in", attendance_controller_1.handleCheckIn);
router.post("/check-out", attendance_controller_1.handleCheckOut);
router.get("/today-status", attendance_controller_1.getTodayAttendanceStatus);
/*
 * Super Agent & Agent can mark attendance
 */
router.post("/", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "CUSTOMER_SUPPORT"), attendance_controller_1.createAttendance);
/*
 * Super Agent & Agent can view all attendance
 */
router.get("/", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "WORKER", "CUSTOMER_SUPPORT"), attendance_controller_1.getAllAttendance);
/*
 * Super Agent, Agent & Worker can view worker attendance
 */
router.get("/:workerId", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "WORKER", "CUSTOMER_SUPPORT"), attendance_controller_1.getWorkerAttendance);
/*
 * Super Agent & Agent can update attendance
 */
router.put("/:id", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "CUSTOMER_SUPPORT"), attendance_controller_1.updateAttendance);
/*
 * Only Super Agent can delete attendance
 */
router.delete("/:id", (0, role_middleware_1.authorize)("SUPER_AGENT"), attendance_controller_1.deleteAttendance);
exports.default = router;
