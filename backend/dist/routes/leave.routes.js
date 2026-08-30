"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const leave_controller_1 = require("../controllers/leave.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/*
 * Apply Leave (Worker, Agent, Super Agent)
 */
router.post("/", (0, role_middleware_1.authorize)(client_1.UserRole.WORKER, client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.applyLeave);
/*
 * Get My Leaves (Only logged-in worker's leaves)
 */
router.get("/my", (0, role_middleware_1.authorize)(client_1.UserRole.WORKER, client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.getMyLeaves);
/*
 * Agent & Super Agent Routes (Pending, Approve, Reject)
 */
router.get("/pending", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.getPendingLeaves);
router.put("/:id/approve", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.approveLeave);
router.put("/:id/reject", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.rejectLeave);
/*
 * View All Leaves (Strictly AGENT & SUPER_AGENT permission only)
 */
router.get("/", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT, client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), leave_controller_1.getAllLeaves);
exports.default = router;
