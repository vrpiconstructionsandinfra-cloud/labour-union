"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("../controllers/support.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
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
