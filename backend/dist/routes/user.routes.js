"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const user_controller_1 = require("../controllers/user.controller");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Public route for QR Code scanner verification (Unauthenticated)
router.get("/public/:id", user_controller_1.getPublicWorker);
router.use(auth_middleware_1.authenticate);
// Get all users
router.get("/", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), user_controller_1.findAll);
// Get all workers
router.get("/workers", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), user_controller_1.workers);
// Get all agents
router.get("/agents", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), user_controller_1.agents);
// Get user by ID
router.get("/:id", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), user_controller_1.findOne);
// Update user
router.put("/:id", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), user_controller_1.update);
// Delete user
router.delete("/:id", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), user_controller_1.remove);
exports.default = router;
