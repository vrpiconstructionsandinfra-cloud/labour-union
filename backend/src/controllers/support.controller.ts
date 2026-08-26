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
    const targetWorkerId = workerId ? Number(workerId) : req.user!.id;
    const targetAgentId = handledById || agentId ? Number(handledById || agentId) : undefined;

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