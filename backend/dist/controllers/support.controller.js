"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupportTicket = createSupportTicket;
exports.getMyTickets = getMyTickets;
exports.getTickets = getTickets;
exports.getTicket = getTicket;
exports.replyToTicket = replyToTicket;
exports.closeTicket = closeTicket;
exports.updateTicketDetails = updateTicketDetails;
exports.getTicketComments = getTicketComments;
exports.addTicketComment = addTicketComment;
exports.getSupportAnalytics = getSupportAnalytics;
exports.getFieldAgents = getFieldAgents;
exports.assignAgentBasket = assignAgentBasket;
exports.unassignAgentBasket = unassignAgentBasket;
exports.assignSiteDuration = assignSiteDuration;
exports.updateSiteStatus = updateSiteStatus;
exports.getAgentMessages = getAgentMessages;
exports.sendAgentMessage = sendAgentMessage;
exports.raiseTicketFromChat = raiseTicketFromChat;
const supportService = __importStar(require("../services/support.service"));
/*
 * Worker - Create Ticket
 */
async function createSupportTicket(req, res) {
    try {
        const { subject, description, priority, workerId, handledById, agentId, attachmentUrl } = req.body;
        const reqUser = req.user;
        if (reqUser?.role === 'WORKER') {
            return res.status(403).json({
                success: false,
                message: "Support ticket creation is disabled for workers.",
            });
        }
        const targetWorkerId = workerId && Number(workerId) > 0 ? Number(workerId) : (agentId ? Number(agentId) : reqUser?.id);
        const targetAgentId = handledById ? Number(handledById) : undefined;
        const ticket = await supportService.createTicket(targetWorkerId, subject, description, priority, targetAgentId, attachmentUrl);
        res.status(201).json({
            success: true,
            data: ticket,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Worker - My Tickets
 */
async function getMyTickets(req, res) {
    try {
        const tickets = await supportService.getMyTickets(req.user.id);
        res.json({
            success: true,
            data: tickets,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Agent / Super Agent - All Tickets
 */
async function getTickets(req, res) {
    try {
        const tickets = await supportService.getAllTickets(req.user);
        res.json({
            success: true,
            data: tickets,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Ticket By ID
 */
async function getTicket(req, res) {
    try {
        const ticket = await supportService.getTicketById(Number(req.params.id));
        res.json({
            success: true,
            data: ticket,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Reply to Ticket
 */
async function replyToTicket(req, res) {
    try {
        const { reply } = req.body;
        const ticket = await supportService.replyTicket(Number(req.params.id), reply, req.user.id);
        res.json({
            success: true,
            message: "Reply added successfully",
            data: ticket,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Close Ticket
 */
async function closeTicket(req, res) {
    try {
        const ticket = await supportService.closeTicket(Number(req.params.id), req.user.id);
        res.json({
            success: true,
            message: "Ticket closed successfully",
            data: ticket,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Update Ticket Details
 */
async function updateTicketDetails(req, res) {
    try {
        const { subject, description, priority, status, handledById, handledBy, unassign } = req.body;
        const ticket = await supportService.updateTicket(Number(req.params.id), { subject, description, priority, status, handledById, handledBy, unassign }, req.user);
        res.json({
            success: true,
            message: "Ticket updated successfully",
            data: ticket,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get Comments for a Ticket
 */
async function getTicketComments(req, res) {
    try {
        const comments = await supportService.getTicketComments(Number(req.params.id));
        res.json({
            success: true,
            data: comments,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Add Comment to a Ticket
 */
async function addTicketComment(req, res) {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "Comment message is required",
            });
        }
        const comment = await supportService.addTicketComment(Number(req.params.id), req.user.id, message.trim());
        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: comment,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get Support Analytics for Support Portal Dashboard
 */
async function getSupportAnalytics(req, res) {
    try {
        const analytics = await supportService.getSupportAnalytics(req.user);
        res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
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
async function getFieldAgents(req, res) {
    try {
        const supportUserId = req.user.id;
        const agents = await supportService.getFieldAgentsForSupport(supportUserId);
        res.json({
            success: true,
            data: agents,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch field agents",
        });
    }
}
/*
 * Assign Agent to Support Agent Basket
 */
async function assignAgentBasket(req, res) {
    try {
        const supportUserId = req.user.id;
        const agentId = Number(req.params.agentId);
        const updated = await supportService.assignAgentToSupportBasket(supportUserId, agentId);
        res.json({
            success: true,
            message: "Agent added to your basket successfully",
            data: updated,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to assign agent to basket",
        });
    }
}
/*
 * Unassign Agent from Support Agent Basket
 */
async function unassignAgentBasket(req, res) {
    try {
        const agentId = Number(req.params.agentId);
        const updated = await supportService.unassignAgentFromSupportBasket(agentId);
        res.json({
            success: true,
            message: "Agent removed from basket successfully",
            data: updated,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to unassign agent from basket",
        });
    }
}
/*
 * Assign Working Site with Duration (Days)
 */
async function assignSiteDuration(req, res) {
    try {
        const supportUserId = req.user.id;
        const agentId = Number(req.params.agentId);
        const { siteId, durationDays, startDate } = req.body;
        if (!siteId) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid working site",
            });
        }
        const assignment = await supportService.assignSiteWithDuration(supportUserId, agentId, Number(siteId), Number(durationDays) || 7, startDate);
        res.json({
            success: true,
            message: "Site assigned to agent successfully",
            data: assignment,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to assign site",
        });
    }
}
/*
 * Update Site Status (Active, In Progress, Completed / Work Done, On Hold)
 */
async function updateSiteStatus(req, res) {
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to update site status",
        });
    }
}
/*
 * Get Messages with Field Agent
 */
async function getAgentMessages(req, res) {
    try {
        const agentId = Number(req.params.agentId);
        const messages = await supportService.getSupportAgentMessages(agentId);
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch messages",
        });
    }
}
/*
 * Send Message to Field Agent (Chat / Equipment Request / Emergency)
 */
async function sendAgentMessage(req, res) {
    try {
        const senderId = req.user.id;
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to send message",
        });
    }
}
/*
 * Raise Emergency Support Ticket from Chat
 */
async function raiseTicketFromChat(req, res) {
    try {
        const supportUserId = req.user.id;
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
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to raise support ticket",
        });
    }
}
