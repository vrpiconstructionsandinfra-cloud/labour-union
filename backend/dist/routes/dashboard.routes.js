"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Allow authenticated users (SUPER_AGENT, AGENT, WORKER) to view dashboard statistics
router.get("/", auth_middleware_1.authenticate, (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER, client_1.UserRole.CUSTOMER_SUPPORT), dashboard_controller_1.getDashboardStats);
exports.default = router;
