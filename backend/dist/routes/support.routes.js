"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../controllers/support.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
/*
 * Customer Support: Field Agent & Site Management Routes
 */
router.get("/field-agents", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT, client_1.UserRole.AGENT), support_controller_1.getFieldAgents);
router.patch("/field-agents/:agentId/assign-basket", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), support_controller_1.assignAgentBasket);
router.patch("/field-agents/:agentId/unassign-basket", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), support_controller_1.unassignAgentBasket);
router.post("/field-agents/:agentId/assign-site", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT), support_controller_1.assignSiteDuration);
router.patch("/sites/:siteId/status", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT, client_1.UserRole.AGENT), support_controller_1.updateSiteStatus);
router.get("/messages/:agentId", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT, client_1.UserRole.AGENT), support_controller_1.getAgentMessages);
router.post("/messages", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT, client_1.UserRole.AGENT), support_controller_1.sendAgentMessage);
router.post("/messages/raise-ticket", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.CUSTOMER_SUPPORT, client_1.UserRole.AGENT), support_controller_1.raiseTicketFromChat);
/*
 * Worker Routes
 */
router.post("/", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.createSupportTicket);
router.get("/my", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.getMyTickets);
/*
 * Agent & Super Agent Routes
 */
router.get("/analytics", (0, role_middleware_1.authorize)("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.getSupportAnalytics);
router.get("/", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.getTickets);
router.get("/:id", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.getTicket);
router.patch("/:id", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.updateTicketDetails);
router.patch("/:id/reply", (0, role_middleware_1.authorize)("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.replyToTicket);
router.patch("/:id/close", (0, role_middleware_1.authorize)("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.closeTicket);
router.get("/:id/comments", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.getTicketComments);
router.post("/:id/comments", (0, role_middleware_1.authorize)("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"), support_controller_1.addTicketComment);
exports.default = router;
