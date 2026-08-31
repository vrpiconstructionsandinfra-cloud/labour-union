import { Request, Response } from "express";
import * as supportService from "../services/support.service";

/*
 * Worker - Create Ticket
 */
export async function createSupportTicket(
  req: Request,
  res: Response
) {
  try {
    const { subject, description, priority, workerId, handledById, agentId, attachmentUrl } = req.body;
    const reqUser = (req as any).user;

    if (reqUser?.role === 'WORKER') {
      return res.status(403).json({
        success: false,
        message: "Support ticket creation is disabled for workers.",
      });
    }

    const targetWorkerId = workerId && Number(workerId) > 0 ? Number(workerId) : (agentId ? Number(agentId) : reqUser?.id);
    const targetAgentId = handledById ? Number(handledById) : undefined;

    const ticket = await supportService.createTicket(
      targetWorkerId,
      subject,
      description,
      priority,
      targetAgentId,
      attachmentUrl
    );

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Worker - My Tickets
 */
export async function getMyTickets(
  req: Request,
  res: Response
) {
  try {
    const tickets = await supportService.getMyTickets(
      req.user!.id
    );

    res.json({
      success: true,
      data: tickets,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Agent / Super Agent - All Tickets
 */
export async function getTickets(
  req: Request,
  res: Response
) {
  try {
    const tickets = await supportService.getAllTickets((req as any).user);

    res.json({
      success: true,
      data: tickets,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Ticket By ID
 */
export async function getTicket(
  req: Request,
  res: Response
) {
  try {
    const ticket = await supportService.getTicketById(
      Number(req.params.id)
    );

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Reply to Ticket
 */
export async function replyToTicket(
  req: Request,
  res: Response
) {
  try {
    const { reply } = req.body;

    const ticket = await supportService.replyTicket(
      Number(req.params.id),
      reply,
      req.user!.id
    );

    res.json({
      success: true,
      message: "Reply added successfully",
      data: ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Close Ticket
 */
export async function closeTicket(
  req: Request,
  res: Response
) {
  try {
    const ticket = await supportService.closeTicket(
      Number(req.params.id),
      req.user!.id
    );

    res.json({
      success: true,
      message: "Ticket closed successfully",
      data: ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Update Ticket Details
 */
export async function updateTicketDetails(
  req: Request,
  res: Response
) {
  try {
    const { subject, description, priority, status, handledById, handledBy, unassign } = req.body;
    const ticket = await supportService.updateTicket(
      Number(req.params.id),
      { subject, description, priority, status, handledById, handledBy, unassign },
      (req as any).user
    );

    res.json({
      success: true,
      message: "Ticket updated successfully",
      data: ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get Comments for a Ticket
 */
export async function getTicketComments(
  req: Request,
  res: Response
) {
  try {
    const comments = await supportService.getTicketComments(
      Number(req.params.id)
    );

    res.json({
      success: true,
      data: comments,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Add Comment to a Ticket
 */
export async function addTicketComment(
  req: Request,
  res: Response
) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment message is required",
      });
    }

    const comment = await supportService.addTicketComment(
      Number(req.params.id),
      req.user!.id,
      message.trim()
    );

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get Support Analytics for Support Portal Dashboard
 */
export async function getSupportAnalytics(
  req: Request,
  res: Response
) {
  try {
    const analytics = await supportService.getSupportAnalytics((req as any).user);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer Support: Field Agent, Basket, Site & Messaging Controller Handlers
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * List all Field Agents for Support Portal
 */
export async function getFieldAgents(req: Request, res: Response) {
  try {
    const supportUserId = req.user!.id;
    const agents = await supportService.getFieldAgentsForSupport(supportUserId);

    res.json({
      success: true,
      data: agents,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch field agents",
    });
  }
}

/*
 * Assign Agent to Support Agent Basket
 */
export async function assignAgentBasket(req: Request, res: Response) {
  try {
    const supportUserId = req.user!.id;
    const agentId = Number(req.params.agentId);

    const updated = await supportService.assignAgentToSupportBasket(supportUserId, agentId);

    res.json({
      success: true,
      message: "Agent added to your basket successfully",
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to assign agent to basket",
    });
  }
}

/*
 * Unassign Agent from Support Agent Basket
 */
export async function unassignAgentBasket(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.agentId);
    const updated = await supportService.unassignAgentFromSupportBasket(agentId);

    res.json({
      success: true,
      message: "Agent removed from basket successfully",
      data: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to unassign agent from basket",
    });
  }
}

/*
 * Assign Working Site with Duration (Days)
 */
export async function assignSiteDuration(req: Request, res: Response) {
  try {
    const supportUserId = req.user!.id;
    const agentId = Number(req.params.agentId);
    const { siteId, durationDays, startDate } = req.body;

    if (!siteId) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid working site",
      });
    }

    const assignment = await supportService.assignSiteWithDuration(
      supportUserId,
      agentId,
      Number(siteId),
      Number(durationDays) || 7,
      startDate
    );

    res.json({
      success: true,
      message: "Site assigned to agent successfully",
      data: assignment,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to assign site",
    });
  }
}

/*
 * Update Site Status (Active, In Progress, Completed / Work Done, On Hold)
 */
export async function updateSiteStatus(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Site status is required",
      });
    }

    const updatedSite = await supportService.updateSiteStatusBySupport(siteId, status);

    res.json({
      success: true,
      message: "Site status updated successfully",
      data: updatedSite,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update site status",
    });
  }
}

/*
 * Get Messages with Field Agent
 */
export async function getAgentMessages(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.agentId);
    const messages = await supportService.getSupportAgentMessages(agentId);

    res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch messages",
    });
  }
}

/*
 * Send Message to Field Agent (Chat / Equipment Request / Emergency)
 */
export async function sendAgentMessage(req: Request, res: Response) {
  try {
    const senderId = req.user!.id;
    const { supportAgentId, fieldAgentId, message, messageType, ticketId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty",
      });
    }

    const savedMessage = await supportService.sendSupportAgentMessage({
      supportAgentId: Number(supportAgentId) || senderId,
      fieldAgentId: Number(fieldAgentId),
      senderId,
      message: message.trim(),
      messageType: messageType || "TEXT",
      ticketId: ticketId ? Number(ticketId) : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: savedMessage,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send message",
    });
  }
}

/*
 * Raise Emergency Support Ticket from Chat
 */
export async function raiseTicketFromChat(req: Request, res: Response) {
  try {
    const supportUserId = req.user!.id;
    const { fieldAgentId, subject, description, priority } = req.body;

    if (!fieldAgentId || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: "Field Agent ID, Subject, and Description are required",
      });
    }

    const ticket = await supportService.raiseTicketFromSupportChat({
      supportAgentId: supportUserId,
      fieldAgentId: Number(fieldAgentId),
      subject: subject.trim(),
      description: description.trim(),
      priority: priority || "HIGH",
    });

    res.status(201).json({
      success: true,
      message: "Support ticket raised successfully from chat",
      data: ticket,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to raise support ticket",
    });
  }
}
