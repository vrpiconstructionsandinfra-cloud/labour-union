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
} from "../controllers/support.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.use(authenticate);

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