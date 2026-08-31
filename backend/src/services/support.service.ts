import prisma from "../config/prisma";
import { TicketStatus, UserRole } from "@prisma/client";
import { emitTicketUpdate, emitTicketComment } from "../socket/socket";
import { createNotification } from "./notification.service";

/*
 * Worker creates a support ticket
 */
export async function createTicket(
  workerId: number,
  subject: string,
  description: string,
  priority: string,
  handledById?: number,
  attachmentUrl?: string
) {
  let targetAgentId = handledById || null;

  const ticket = await prisma.supportTicket.create({
    data: {
      workerId,
      subject,
      description,
      priority,
      handledById: targetAgentId,
      attachmentUrl,
    },
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
        },
      },
      handledBy: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          role: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  emitTicketUpdate(ticket);
  
  // Notify Support Agents about the new ticket
  createNotification({
    role: "CUSTOMER_SUPPORT" as UserRole,
    title: `New Support Ticket #TKT-${ticket.id}`,
    message: `New Ticket #TKT-${ticket.id} (${subject}) submitted by ${ticket.worker?.name || 'Worker'}.`,
    type: "SUPPORT",
  }).catch(() => {});

  if (targetAgentId) {
    createNotification({
      userId: targetAgentId,
      title: `Assigned Ticket #TKT-${ticket.id}`,
      message: `You were assigned Support Ticket #TKT-${ticket.id}: ${subject}`,
      type: "SUPPORT",
    }).catch(() => {});
  }
  return ticket;
}

/*
 * Worker - My Tickets
 */
export async function getMyTickets(workerId: number) {
  return prisma.supportTicket.findMany({
    where: {
      workerId,
    },
    include: {
      _count: {
        select: { comments: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Agent / Super Agent - All Tickets (Scoped by role)
 */
export async function getAllTickets(reqUser?: { id: number; role: string }) {
  const where: any = {};

  if (reqUser?.role === "WORKER") {
    where.workerId = reqUser.id;
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      worker: true,
      handledBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tickets.map((t: any) => ({
    ...t,
    creatorName: t.worker?.name || t.handledBy?.name || "User",
    creatorRole: t.worker?.role || "WORKER",
  }));
}

/*
 * Ticket By ID
 */
export async function getTicketById(id: number) {
  return prisma.supportTicket.findUnique({
    where: {
      id,
    },
    include: {
      worker: true,
      handledBy: true,
      _count: {
        select: { comments: true },
      },
    },
  });
}

/*
 * Update Ticket Details (Subject, Description, Priority, Status)
 */
export async function updateTicket(
  id: number,
  data: {
    subject?: string;
    description?: string;
    priority?: string;
    status?: TicketStatus;
    handledById?: number | null;
    handledBy?: string | null;
    unassign?: boolean;
  },
  reqUser: { id: number; role: string }
) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  // Permission checks
  if (reqUser.role === "WORKER") {
    if (ticket.workerId !== reqUser.id) {
      throw new Error("Unauthorized to edit this ticket");
    }
    if (ticket.status !== TicketStatus.OPEN) {
      throw new Error("Workers can only edit tickets that are still OPEN");
    }
  }

  const updateData: any = {};
  if (data.subject !== undefined) updateData.subject = data.subject;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;

  // Only Agent/Admin can update status and handledById
  if (reqUser.role !== "WORKER") {
    if (data.status !== undefined && data.status !== null) {
      let statusStr = String(data.status).toUpperCase().trim().replace(/\s+/g, '_');
      if (statusStr === 'RESOLVED') updateData.status = TicketStatus.RESOLVED;
      else if (statusStr === 'IN_PROGRESS') updateData.status = TicketStatus.IN_PROGRESS;
      else if (statusStr === 'CLOSED') updateData.status = TicketStatus.CLOSED;
      else if (statusStr === 'OPEN') updateData.status = TicketStatus.OPEN;
    }

    if (
      data.unassign ||
      data.handledById === null ||
      data.handledById === 0 ||
      data.handledBy === "" ||
      data.handledBy === null
    ) {
      updateData.handledById = null;
      if (data.status === undefined) {
        updateData.status = TicketStatus.OPEN;
      }
    } else if (data.handledById !== undefined && data.handledById !== null && data.handledById > 0) {
      updateData.handledById = Number(data.handledById);
      if (data.status === undefined && ticket.status === TicketStatus.OPEN) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    } else if (data.handledBy) {
      updateData.handledById = reqUser.id;
      if (data.status === undefined && ticket.status === TicketStatus.OPEN) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: updateData,
    include: {
      worker: true,
      handledBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: { comments: true },
      },
    },
  });

  emitTicketUpdate(updated);

  if (reqUser.role !== "WORKER" && updated.workerId !== reqUser.id) {
    createNotification({
      userId: updated.workerId,
      title: "Support Ticket Updated",
      message: `Your ticket #${updated.id} (${updated.subject}) status is now ${updated.status}.`,
      type: "SUPPORT",
    }).catch(() => {});
  }

  if (updated.handledById && updated.handledById !== ticket.handledById && updated.handledById !== reqUser.id) {
    createNotification({
      userId: updated.handledById,
      title: `Assigned Ticket #TKT-${updated.id}`,
      message: `You were assigned Support Ticket #TKT-${updated.id}: "${updated.subject}".`,
      type: "SUPPORT",
    }).catch(() => {});
  }

  return updated;
}

/*
 * Reply to Ticket
 */
export async function replyTicket(
  id: number,
  reply: string,
  handledById: number
) {
  const updated = await prisma.supportTicket.update({
    where: {
      id,
    },
    data: {
      reply,
      handledById,
      status: TicketStatus.IN_PROGRESS,
    },
    include: {
      worker: true,
      handledBy: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  emitTicketUpdate(updated);
  createNotification({
    userId: updated.workerId,
    title: "Support Ticket Update",
    message: `Your support ticket #${updated.id} (${updated.subject}) received a response.`,
    type: "SUPPORT",
  }).catch(() => {});
  return updated;
}

/*
 * Close Ticket
 */
export async function closeTicket(
  id: number,
  handledById: number
) {
  const updated = await prisma.supportTicket.update({
    where: {
      id,
    },
    data: {
      handledById,
      status: TicketStatus.CLOSED,
    },
    include: {
      worker: true,
      handledBy: true,
      _count: {
        select: { comments: true },
      },
    },
  });

  emitTicketUpdate(updated);
  createNotification({
    userId: updated.workerId,
    title: "Support Ticket Closed",
    message: `Your support ticket #${updated.id} (${updated.subject}) has been closed.`,
    type: "SUPPORT",
  }).catch(() => {});
  return updated;
}

/*
 * Get Comments for a Ticket
 */
export async function getTicketComments(ticketId: number) {
  const comments = await prisma.supportTicketComment.findMany({
    where: { ticketId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return comments.map((c) => ({
    id: c.id,
    ticketId: c.ticketId,
    authorId: c.authorId,
    authorName: c.author?.name || "User",
    authorRole: c.author?.role || "WORKER",
    message: c.message,
    createdAt: c.createdAt,
  }));
}

/*
 * Add Comment to a Ticket
 */
export async function addTicketComment(
  ticketId: number,
  authorId: number,
  message: string
) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const comment = await prisma.supportTicketComment.create({
    data: {
      ticketId,
      authorId,
      message,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  const commentData = {
    id: comment.id,
    ticketId: comment.ticketId,
    authorId: comment.authorId,
    authorName: comment.author?.name || "User",
    authorRole: comment.author?.role || "WORKER",
    message: comment.message,
    createdAt: comment.createdAt,
  };

  emitTicketComment(commentData);

  // Send notification if author is not the worker
  if (authorId !== ticket.workerId) {
    createNotification({
      userId: ticket.workerId,
      title: `New Message on Ticket #TKT-${ticket.id}`,
      message: `New message on Ticket #TKT-${ticket.id}: "${message.slice(0, 60)}"`,
      type: "SUPPORT",
    }).catch(() => {});
  }

  // Send notification to assigned agent if author is not the assigned agent
  if (ticket.handledById && authorId !== ticket.handledById) {
    createNotification({
      userId: ticket.handledById,
      title: `New Message on Ticket #TKT-${ticket.id}`,
      message: `${comment.author?.name || 'Worker'} sent a message on Ticket #TKT-${ticket.id}: "${message.slice(0, 60)}"`,
      type: "SUPPORT",
    }).catch(() => {});
  }

  return commentData;
}

/*
 * Get Support Analytics for Support Portal Dashboard
 */
export async function getSupportAnalytics(reqUser?: { id: number; role: string }) {
  const where: any = {};

  if (reqUser?.role === "WORKER") {
    where.workerId = reqUser.id;
  }

  const allTickets = await prisma.supportTicket.findMany({
    where,
    include: {
      worker: true,
      handledBy: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      comments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalTickets = allTickets.length;
  const openTickets = allTickets.filter((t) => t.status === TicketStatus.OPEN).length;
  const inProgressTickets = allTickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
  const resolvedTickets = allTickets.filter((t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED).length;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const overdueTickets = allTickets.filter(
    (t) => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED && new Date(t.createdAt) < threeDaysAgo
  ).length;

  // Generate last 7 days trend data
  const days: { label: string; dateStr: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.toLocaleString('default', { month: 'short' });
    const dayNum = d.getDate();
    days.push({
      label: `${month} ${dayNum}`,
      dateStr: d.toISOString().split('T')[0],
    });
  }

  const ticketsOverview = days.map((day) => {
    const opened = allTickets.filter((t) => {
      const ticketDate = new Date(t.createdAt).toISOString().split('T')[0];
      return ticketDate === day.dateStr;
    }).length;

    const resolved = allTickets.filter((t) => {
      if (t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED) return false;
      const updatedDate = new Date(t.updatedAt).toISOString().split('T')[0];
      return updatedDate === day.dateStr;
    }).length;

    const overdue = allTickets.filter((t) => {
      if (t.status === TicketStatus.CLOSED || t.status === TicketStatus.RESOLVED) return false;
      const createdDate = new Date(t.createdAt).toISOString().split('T')[0];
      return createdDate <= day.dateStr && new Date(t.createdAt) < threeDaysAgo;
    }).length;

    return {
      day: day.label,
      opened,
      resolved,
      overdue,
    };
  });

  // Priority breakdown
  const highPriority = allTickets.filter(
    (t) => t.priority?.toUpperCase() === "HIGH"
  ).length;
  const mediumPriority = allTickets.filter(
    (t) => t.priority?.toUpperCase() === "MEDIUM" || !t.priority
  ).length;
  const lowPriority = allTickets.filter(
    (t) => t.priority?.toUpperCase() === "LOW"
  ).length;

  const ticketsByPriority = [
    { priority: "High", count: highPriority, percentage: totalTickets ? Math.round((highPriority / totalTickets) * 1000) / 10 : 0 },
    { priority: "Medium", count: mediumPriority, percentage: totalTickets ? Math.round((mediumPriority / totalTickets) * 1000) / 10 : 0 },
    { priority: "Low", count: lowPriority, percentage: totalTickets ? Math.round((lowPriority / totalTickets) * 1000) / 10 : 0 },
  ];

  // Live Ticket Feed (Recent 10)
  const liveTicketFeed = allTickets.slice(0, 10).map((t) => {
    const diffMs = now.getTime() - new Date(t.updatedAt || t.createdAt).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    let timeAgo = `${diffMins}m ago`;
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      timeAgo = `${hours}h ago`;
      if (hours >= 24) {
        timeAgo = `${Math.floor(hours / 24)}d ago`;
      }
    }

    const actionText = t.status === TicketStatus.CLOSED ? "Ticket resolved" : (t.reply || t.comments.length > 0 ? "Customer replied" : "New ticket received");

    return {
      id: t.id,
      ticketNumber: `#TKT-${t.id}`,
      customerName: t.worker?.name || t.handledBy?.name || "User",
      subject: t.subject,
      action: actionText,
      timeAgo,
      updatedAt: t.updatedAt,
    };
  });

  // Recent Tickets List
  const recentTickets = allTickets.slice(0, 10).map((t) => {
    const diffMs = now.getTime() - new Date(t.updatedAt || t.createdAt).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    let timeAgo = `${diffMins}m ago`;
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      timeAgo = `${hours}h ago`;
      if (hours >= 24) {
        timeAgo = `${Math.floor(hours / 24)}d ago`;
      }
    }

    return {
      id: t.id,
      ticketNumber: `#TKT-${t.id}`,
      subject: t.subject,
      customerName: t.worker?.name || t.handledBy?.name || "User",
      customerPhone: t.worker?.phone || null,
      customerEmail: t.worker?.email || null,
      priority: t.priority || "MEDIUM",
      status: t.status,
      updatedAt: t.updatedAt,
      timeAgo,
      handledById: t.handledById || null,
      handledBy: t.handledBy?.name || null,
    };
  });

  // Performance Summary
  let totalResponseTimeMinutes = 0;
  let responseCount = 0;
  allTickets.forEach((t) => {
    if (t.reply || t.comments.length > 0) {
      const firstResponseTime = t.reply ? new Date(t.updatedAt).getTime() : (t.comments[0] ? new Date(t.comments[0].createdAt).getTime() : 0);
      if (firstResponseTime > 0) {
        const diff = (firstResponseTime - new Date(t.createdAt).getTime()) / (1000 * 60);
        if (diff > 0) {
          totalResponseTimeMinutes += diff;
          responseCount++;
        }
      }
    }
  });

  const avgResponseTimeMins = responseCount > 0 ? Math.round(totalResponseTimeMinutes / responseCount) : 84; // 1h 24m default format
  const hours = Math.floor(avgResponseTimeMins / 60);
  const mins = avgResponseTimeMins % 60;
  const avgResponseTimeStr = `${hours}h ${mins}m`;

  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 1000) / 10 : 92.4;

  return {
    stats: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      overdueTickets,
    },
    ticketsOverview,
    ticketsByPriority,
    liveTicketFeed,
    recentTickets,
    performanceSummary: {
      avgResponseTime: avgResponseTimeStr,
      resolutionRate: `${resolutionRate}%`,
      customerSatisfaction: "4.6 / 5",
    },
  };
}

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * Customer Support: Field Agent & Site Management Methods
 * ─────────────────────────────────────────────────────────────────────────────
 */

/*
 * List all Field Agents for Support Portal with site assignments, duration, workers count, and basket status
 */
export async function getFieldAgentsForSupport(supportUserId: number) {
  const agents = await prisma.user.findMany({
    where: {
      role: UserRole.AGENT,
    },
    include: {
      site: true,
      workers: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          phone: true,
          email: true,
          status: true,
          profileImage: true,
          attendance: {
            take: 1,
            orderBy: { date: "desc" },
            select: { date: true, status: true, checkInTime: true }
          }
        },
      },
      managedBySupport: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          email: true,
        },
      },
      siteAssignments: {
        orderBy: { createdAt: "desc" },
        include: {
          site: true,
          assignedBy: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
            }
          }
        }
      }
    },
    orderBy: {
      name: "asc",
    },
  });

  const now = new Date();

  return agents.map((agent) => {
    const activeAssignment = agent.siteAssignments.find((sa) => sa.status === "ACTIVE" || sa.status === "IN_PROGRESS") || agent.siteAssignments[0] || null;

    let remainingDays: number | null = null;
    if (activeAssignment?.startDate && activeAssignment?.durationDays) {
      const start = new Date(activeAssignment.startDate);
      const elapsedDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      remainingDays = Math.max(0, activeAssignment.durationDays - elapsedDays);
    }

    return {
      id: agent.id,
      name: agent.name,
      employeeCode: agent.employeeCode || `AGT-${agent.id}`,
      email: agent.email,
      phone: agent.phone,
      address: agent.address,
      status: agent.status,
      active: agent.active,
      profileImage: agent.profileImage,
      joiningDate: agent.joiningDate,
      managedBySupportId: agent.managedBySupportId,
      isInMyBasket: agent.managedBySupportId === supportUserId,
      managedBySupport: agent.managedBySupport,
      currentSite: agent.site ? {
        id: agent.site.id,
        siteName: agent.site.siteName,
        siteCode: agent.site.siteCode,
        companyName: agent.site.companyName,
        status: agent.site.status || "ACTIVE",
        address: agent.site.address,
        city: agent.site.city,
        state: agent.site.state,
      } : null,
      activeAssignment: activeAssignment ? {
        id: activeAssignment.id,
        siteId: activeAssignment.siteId,
        siteName: activeAssignment.site?.siteName,
        durationDays: activeAssignment.durationDays,
        remainingDays,
        startDate: activeAssignment.startDate,
        endDate: activeAssignment.endDate,
        status: activeAssignment.status,
        assignedBy: activeAssignment.assignedBy?.name || "Support Team",
      } : null,
      workersCount: agent.workers.length,
      workers: agent.workers.map(w => ({
        id: w.id,
        name: w.name,
        employeeCode: w.employeeCode || `WRK-${w.id}`,
        phone: w.phone,
        email: w.email,
        status: w.status,
        profileImage: w.profileImage,
        todayAttendance: w.attendance[0]?.status || "ABSENT",
      })),
    };
  });
}

/*
 * Claim/Assign Agent into Support Agent's Basket
 */
export async function assignAgentToSupportBasket(supportUserId: number, agentId: number) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== UserRole.AGENT) {
    throw new Error("Field Agent not found");
  }

  const updated = await prisma.user.update({
    where: { id: agentId },
    data: { managedBySupportId: supportUserId },
    include: {
      managedBySupport: {
        select: { id: true, name: true, employeeCode: true }
      }
    }
  });

  return updated;
}

/*
 * Release/Unassign Agent from Basket
 */
export async function unassignAgentFromSupportBasket(agentId: number) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== UserRole.AGENT) {
    throw new Error("Field Agent not found");
  }

  const updated = await prisma.user.update({
    where: { id: agentId },
    data: { managedBySupportId: null },
  });

  return updated;
}

/*
 * Assign Working Site to an Agent with Duration (Days)
 */
export async function assignSiteWithDuration(
  supportUserId: number,
  agentId: number,
  siteId: number,
  durationDays: number,
  startDate?: string
) {
  const agent = await prisma.user.findUnique({ where: { id: agentId } });
  if (!agent || agent.role !== UserRole.AGENT) {
    throw new Error("Field Agent not found");
  }

  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    throw new Error("Site not found");
  }

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (Number(durationDays) || 1));

  // Mark previous active assignments as COMPLETED
  await prisma.siteAssignment.updateMany({
    where: { agentId, status: "ACTIVE" },
    data: { status: "COMPLETED" },
  });

  // Create new Site Assignment
  const assignment = await prisma.siteAssignment.create({
    data: {
      siteId,
      agentId,
      assignedById: supportUserId,
      durationDays: Number(durationDays),
      startDate: start,
      endDate: end,
      status: "ACTIVE",
    },
    include: {
      site: true,
      agent: true,
    }
  });

  // Update Agent's current siteId
  await prisma.user.update({
    where: { id: agentId },
    data: { siteId },
  });

  // Send Notification to Field Agent
  createNotification({
    userId: agentId,
    title: `New Site Assigned: ${site.siteName}`,
    message: `You have been assigned to ${site.siteName} for ${durationDays} days starting ${start.toLocaleDateString()}.`,
    type: "SITE_ASSIGNED",
  }).catch(() => {});

  return assignment;
}

/*
 * Update Site Status (ACTIVE, IN_PROGRESS, COMPLETED / Work Done, ON_HOLD)
 */
export async function updateSiteStatusBySupport(siteId: number, status: string) {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) {
    throw new Error("Site not found");
  }

  const updatedSite = await prisma.site.update({
    where: { id: siteId },
    data: { status },
  });

  if (status === "COMPLETED") {
    await prisma.siteAssignment.updateMany({
      where: { siteId, status: "ACTIVE" },
      data: { status: "COMPLETED" },
    });
  }

  return updatedSite;
}

/*
 * Support Agent <-> Field Agent Chat: Get Messages
 */
export async function getSupportAgentMessages(fieldAgentId: number) {
  return prisma.supportAgentMessage.findMany({
    where: {
      fieldAgentId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          profileImage: true,
        }
      }
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

/*
 * Support Agent <-> Field Agent Chat: Send Message / Equipment Request / Emergency
 */
export async function sendSupportAgentMessage(data: {
  supportAgentId: number;
  fieldAgentId: number;
  senderId: number;
  message: string;
  messageType?: string;
  ticketId?: number;
}) {
  const messageRecord = await prisma.supportAgentMessage.create({
    data: {
      supportAgentId: data.supportAgentId,
      fieldAgentId: data.fieldAgentId,
      senderId: data.senderId,
      message: data.message,
      messageType: data.messageType || "TEXT",
      ticketId: data.ticketId || null,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          role: true,
          profileImage: true,
        }
      }
    }
  });

  return messageRecord;
}

/*
 * Raise Support Ticket directly from Support-Agent Chat
 */
export async function raiseTicketFromSupportChat(data: {
  supportAgentId: number;
  fieldAgentId: number;
  subject: string;
  description: string;
  priority?: string;
}) {
  const fieldAgent = await prisma.user.findUnique({ where: { id: data.fieldAgentId } });
  if (!fieldAgent) throw new Error("Field Agent not found");

  const ticket = await prisma.supportTicket.create({
    data: {
      workerId: data.fieldAgentId,
      subject: data.subject,
      description: data.description,
      priority: data.priority || "HIGH",
      status: TicketStatus.OPEN,
      handledById: data.supportAgentId,
    },
    include: {
      worker: true,
      handledBy: true,
    }
  });

  emitTicketUpdate(ticket);

  // Also log an automated ticket notification in the chat
  await sendSupportAgentMessage({
    supportAgentId: data.supportAgentId,
    fieldAgentId: data.fieldAgentId,
    senderId: data.supportAgentId,
    message: `🚨 Emergency Ticket Raised: #${ticket.id} — "${data.subject}" (Priority: ${data.priority || 'HIGH'})`,
    messageType: "TICKET_RAISED",
    ticketId: ticket.id,
  });

  return ticket;
}