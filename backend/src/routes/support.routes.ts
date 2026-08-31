import { Router } from "express";

import {
  createSupportTicket,
  getMyTickets,
  getTickets,
  getTicket,
  replyToTicket,
  closeTicket,
  updateTicketDetails,
  getTicketComments,
  addTicketComment,
  getSupportAnalytics,
  getFieldAgents,
  assignAgentBasket,
  unassignAgentBasket,
  assignSiteDuration,
  updateSiteStatus,
  getAgentMessages,
  sendAgentMessage,
  raiseTicketFromChat,
} from "../controllers/support.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);

/*
 * Customer Support: Field Agent & Site Management Routes
 */
router.get(
  "/field-agents",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT, UserRole.AGENT),
  getFieldAgents
);

router.patch(
  "/field-agents/:agentId/assign-basket",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  assignAgentBasket
);

router.patch(
  "/field-agents/:agentId/unassign-basket",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  unassignAgentBasket
);

router.post(
  "/field-agents/:agentId/assign-site",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT),
  assignSiteDuration
);

router.patch(
  "/sites/:siteId/status",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT, UserRole.AGENT),
  updateSiteStatus
);

router.get(
  "/messages/:agentId",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT, UserRole.AGENT),
  getAgentMessages
);

router.post(
  "/messages",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT, UserRole.AGENT),
  sendAgentMessage
);

router.post(
  "/messages/raise-ticket",
  authorize(UserRole.SUPER_AGENT, UserRole.CUSTOMER_SUPPORT, UserRole.AGENT),
  raiseTicketFromChat
);

/*
 * Worker Routes
 */
router.post(
  "/",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  createSupportTicket
);

router.get(
  "/my",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getMyTickets
);

/*
 * Agent & Super Agent Routes
 */
router.get(
  "/analytics",
  authorize("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getSupportAnalytics
);

router.get(
  "/",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getTickets
);

router.get(
  "/:id",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getTicket
);

router.patch(
  "/:id",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  updateTicketDetails
);

router.patch(
  "/:id/reply",
  authorize("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  replyToTicket
);

router.patch(
  "/:id/close",
  authorize("AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  closeTicket
);

router.get(
  "/:id/comments",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  getTicketComments
);

router.post(
  "/:id/comments",
  authorize("WORKER", "AGENT", "SUPER_AGENT", "CUSTOMER_SUPPORT"),
  addTicketComment
);

export default router;