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
