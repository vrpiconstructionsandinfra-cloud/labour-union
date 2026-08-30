"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const payroll_controller_1 = require("../controllers/payroll.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/*
 * Generate payroll
 */
router.post("/", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), payroll_controller_1.generatePayroll);
/*
 * View all payrolls
 */
router.get("/", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), payroll_controller_1.getPayrolls);
/*
 * View payroll by ID
 */
router.get("/:id", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), payroll_controller_1.getPayrollById);
exports.default = router;
