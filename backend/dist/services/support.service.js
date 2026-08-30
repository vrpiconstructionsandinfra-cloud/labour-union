"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.getMyTickets = getMyTickets;
exports.getAllTickets = getAllTickets;
exports.getTicketById = getTicketById;
exports.updateTicket = updateTicket;
exports.replyTicket = replyTicket;
exports.closeTicket = closeTicket;
exports.getTicketComments = getTicketComments;
exports.addTicketComment = addTicketComment;
exports.getSupportAnalytics = getSupportAnalytics;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
const socket_1 = require("../socket/socket");
const notification_service_1 = require("./notification.service");
/*
 * Worker creates a support ticket
 */
async function createTicket(workerId, subject, description, priority, handledById, attachmentUrl) {
    let targetAgentId = handledById || null;
    const ticket = await prisma_1.default.supportTicket.create({
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
    (0, socket_1.emitTicketUpdate)(ticket);
    // Notify Support Agents about the new ticket
    (0, notification_service_1.createNotification)({
        role: "CUSTOMER_SUPPORT",
        title: `New Support Ticket #TKT-${ticket.id}`,
        message: `New Ticket #TKT-${ticket.id} (${subject}) submitted by ${ticket.worker?.name || 'Worker'}.`,
        type: "SUPPORT",
    }).catch(() => { });
    if (targetAgentId) {
        (0, notification_service_1.createNotification)({
            userId: targetAgentId,
            title: `Assigned Ticket #TKT-${ticket.id}`,
            message: `You were assigned Support Ticket #TKT-${ticket.id}: ${subject}`,
            type: "SUPPORT",
        }).catch(() => { });
    }
    return ticket;
}
/*
 * Worker - My Tickets
 */
async function getMyTickets(workerId) {
    return prisma_1.default.supportTicket.findMany({
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
async function getAllTickets(reqUser) {
    const where = {};
    if (reqUser?.role === "WORKER") {
        where.workerId = reqUser.id;
    }
    const tickets = await prisma_1.default.supportTicket.findMany({
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
    return tickets.map((t) => ({
        ...t,
        creatorName: t.worker?.name || t.handledBy?.name || "User",
        creatorRole: t.worker?.role || "WORKER",
    }));
}
/*
 * Ticket By ID
 */
async function getTicketById(id) {
    return prisma_1.default.supportTicket.findUnique({
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
async function updateTicket(id, data, reqUser) {
    const ticket = await prisma_1.default.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
        throw new Error("Ticket not found");
    }
    // Permission checks
    if (reqUser.role === "WORKER") {
        if (ticket.workerId !== reqUser.id) {
            throw new Error("Unauthorized to edit this ticket");
        }
        if (ticket.status !== client_1.TicketStatus.OPEN) {
            throw new Error("Workers can only edit tickets that are still OPEN");
        }
    }
    const updateData = {};
    if (data.subject !== undefined)
        updateData.subject = data.subject;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.priority !== undefined)
        updateData.priority = data.priority;
    // Only Agent/Admin can update status and handledById
    if (reqUser.role !== "WORKER") {
        if (data.status !== undefined && data.status !== null) {
            let statusStr = String(data.status).toUpperCase().trim().replace(/\s+/g, '_');
            if (statusStr === 'RESOLVED')
                updateData.status = client_1.TicketStatus.RESOLVED;
            else if (statusStr === 'IN_PROGRESS')
                updateData.status = client_1.TicketStatus.IN_PROGRESS;
            else if (statusStr === 'CLOSED')
                updateData.status = client_1.TicketStatus.CLOSED;
            else if (statusStr === 'OPEN')
                updateData.status = client_1.TicketStatus.OPEN;
        }
        if (data.unassign ||
            data.handledById === null ||
            data.handledById === 0 ||
            data.handledBy === "" ||
            data.handledBy === null) {
            updateData.handledById = null;
            if (data.status === undefined) {
                updateData.status = client_1.TicketStatus.OPEN;
            }
        }
        else if (data.handledById !== undefined && data.handledById !== null && data.handledById > 0) {
            updateData.handledById = Number(data.handledById);
            if (data.status === undefined && ticket.status === client_1.TicketStatus.OPEN) {
                updateData.status = client_1.TicketStatus.IN_PROGRESS;
            }
        }
        else if (data.handledBy) {
            updateData.handledById = reqUser.id;
            if (data.status === undefined && ticket.status === client_1.TicketStatus.OPEN) {
                updateData.status = client_1.TicketStatus.IN_PROGRESS;
            }
        }
    }
    const updated = await prisma_1.default.supportTicket.update({
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
    (0, socket_1.emitTicketUpdate)(updated);
    if (reqUser.role !== "WORKER" && updated.workerId !== reqUser.id) {
        (0, notification_service_1.createNotification)({
            userId: updated.workerId,
            title: "Support Ticket Updated",
            message: `Your ticket #${updated.id} (${updated.subject}) status is now ${updated.status}.`,
            type: "SUPPORT",
        }).catch(() => { });
    }
    if (updated.handledById && updated.handledById !== ticket.handledById && updated.handledById !== reqUser.id) {
        (0, notification_service_1.createNotification)({
            userId: updated.handledById,
            title: `Assigned Ticket #TKT-${updated.id}`,
            message: `You were assigned Support Ticket #TKT-${updated.id}: "${updated.subject}".`,
            type: "SUPPORT",
        }).catch(() => { });
    }
    return updated;
}
/*
 * Reply to Ticket
 */
async function replyTicket(id, reply, handledById) {
    const updated = await prisma_1.default.supportTicket.update({
        where: {
            id,
        },
        data: {
            reply,
            handledById,
            status: client_1.TicketStatus.IN_PROGRESS,
        },
        include: {
            worker: true,
            handledBy: true,
            _count: {
                select: { comments: true },
            },
        },
    });
    (0, socket_1.emitTicketUpdate)(updated);
    (0, notification_service_1.createNotification)({
        userId: updated.workerId,
        title: "Support Ticket Update",
        message: `Your support ticket #${updated.id} (${updated.subject}) received a response.`,
        type: "SUPPORT",
    }).catch(() => { });
    return updated;
}
/*
 * Close Ticket
 */
async function closeTicket(id, handledById) {
    const updated = await prisma_1.default.supportTicket.update({
        where: {
            id,
        },
        data: {
            handledById,
            status: client_1.TicketStatus.CLOSED,
        },
        include: {
            worker: true,
            handledBy: true,
            _count: {
                select: { comments: true },
            },
        },
    });
    (0, socket_1.emitTicketUpdate)(updated);
    (0, notification_service_1.createNotification)({
        userId: updated.workerId,
        title: "Support Ticket Closed",
        message: `Your support ticket #${updated.id} (${updated.subject}) has been closed.`,
        type: "SUPPORT",
    }).catch(() => { });
    return updated;
}
/*
 * Get Comments for a Ticket
 */
async function getTicketComments(ticketId) {
    const comments = await prisma_1.default.supportTicketComment.findMany({
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
async function addTicketComment(ticketId, authorId, message) {
    const ticket = await prisma_1.default.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
        throw new Error("Ticket not found");
    }
    const comment = await prisma_1.default.supportTicketComment.create({
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
    (0, socket_1.emitTicketComment)(commentData);
    // Send notification if author is not the worker
    if (authorId !== ticket.workerId) {
        (0, notification_service_1.createNotification)({
            userId: ticket.workerId,
            title: `New Message on Ticket #TKT-${ticket.id}`,
            message: `New message on Ticket #TKT-${ticket.id}: "${message.slice(0, 60)}"`,
            type: "SUPPORT",
        }).catch(() => { });
    }
    // Send notification to assigned agent if author is not the assigned agent
    if (ticket.handledById && authorId !== ticket.handledById) {
        (0, notification_service_1.createNotification)({
            userId: ticket.handledById,
            title: `New Message on Ticket #TKT-${ticket.id}`,
            message: `${comment.author?.name || 'Worker'} sent a message on Ticket #TKT-${ticket.id}: "${message.slice(0, 60)}"`,
            type: "SUPPORT",
        }).catch(() => { });
    }
    return commentData;
}
/*
 * Get Support Analytics for Support Portal Dashboard
 */
async function getSupportAnalytics(reqUser) {
    const where = {};
    if (reqUser?.role === "WORKER") {
        where.workerId = reqUser.id;
    }
    const allTickets = await prisma_1.default.supportTicket.findMany({
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
    const openTickets = allTickets.filter((t) => t.status === client_1.TicketStatus.OPEN).length;
    const inProgressTickets = allTickets.filter((t) => t.status === client_1.TicketStatus.IN_PROGRESS).length;
    const resolvedTickets = allTickets.filter((t) => t.status === client_1.TicketStatus.RESOLVED || t.status === client_1.TicketStatus.CLOSED).length;
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const overdueTickets = allTickets.filter((t) => t.status !== client_1.TicketStatus.CLOSED && t.status !== client_1.TicketStatus.RESOLVED && new Date(t.createdAt) < threeDaysAgo).length;
    // Generate last 7 days trend data
    const days = [];
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
            if (t.status !== client_1.TicketStatus.CLOSED && t.status !== client_1.TicketStatus.RESOLVED)
                return false;
            const updatedDate = new Date(t.updatedAt).toISOString().split('T')[0];
            return updatedDate === day.dateStr;
        }).length;
        const overdue = allTickets.filter((t) => {
            if (t.status === client_1.TicketStatus.CLOSED || t.status === client_1.TicketStatus.RESOLVED)
                return false;
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
    const highPriority = allTickets.filter((t) => t.priority?.toUpperCase() === "HIGH").length;
    const mediumPriority = allTickets.filter((t) => t.priority?.toUpperCase() === "MEDIUM" || !t.priority).length;
    const lowPriority = allTickets.filter((t) => t.priority?.toUpperCase() === "LOW").length;
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
        const actionText = t.status === client_1.TicketStatus.CLOSED ? "Ticket resolved" : (t.reply || t.comments.length > 0 ? "Customer replied" : "New ticket received");
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
