"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectLeave = exports.approveLeave = exports.getPendingLeaves = exports.getAllLeaves = exports.getMyLeaves = exports.applyLeave = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
const socket_1 = require("../socket/socket");
const notification_service_1 = require("./notification.service");
/*
 * Apply Leave
 */
const applyLeave = async (workerId, fromDate, toDate, reason) => {
    const worker = await prisma_1.default.user.findUnique({
        where: { id: workerId },
    });
    if (!worker) {
        throw new Error("Worker not found");
    }
    if (fromDate > toDate) {
        throw new Error("From date cannot be greater than To date");
    }
    const existingLeave = await prisma_1.default.leave.findFirst({
        where: {
            workerId,
            OR: [
                {
                    fromDate: { lte: toDate },
                    toDate: { gte: fromDate },
                },
            ],
        },
    });
    if (existingLeave) {
        throw new Error("Leave already exists for selected dates");
    }
    const leave = await prisma_1.default.leave.create({
        data: {
            workerId,
            fromDate,
            toDate,
            reason,
        },
        include: {
            worker: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                },
            },
        },
    });
    (0, socket_1.emitLeaveUpdate)(leave);
    const isSupportRole = worker.role === "CUSTOMER_SUPPORT" || worker.role === "SUPPORT_AGENT" || (worker.designation || "").toLowerCase().includes("support");
    const applicantType = isSupportRole ? "Customer Support Agent" : worker.role === "AGENT" ? "Field Agent" : "Worker";
    const fromStr = new Date(fromDate).toLocaleDateString();
    const toStr = new Date(toDate).toLocaleDateString();
    // Always notify Super Agent for every leave request
    (0, notification_service_1.createNotification)({
        role: "SUPER_AGENT",
        title: `${applicantType} Leave Request`,
        message: `${applicantType} ${worker.name} (${worker.employeeCode || `WRK-${worker.id}`}) submitted a leave request for ${fromStr} to ${toStr}.`,
        type: "LEAVE",
    }).catch(() => { });
    // If worker has assigned agent, notify agent too
    if (worker.assignedAgentId) {
        (0, notification_service_1.createNotification)({
            userId: worker.assignedAgentId,
            title: "Worker Leave Request",
            message: `Worker ${worker.name} submitted a leave request for ${fromStr} to ${toStr}.`,
            type: "LEAVE",
        }).catch(() => { });
    }
    return leave;
};
exports.applyLeave = applyLeave;
/*
 * Get My Leaves
 */
const getMyLeaves = async (workerId) => {
    return prisma_1.default.leave.findMany({
        where: {
            workerId,
        },
        include: {
            worker: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    role: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};
exports.getMyLeaves = getMyLeaves;
/*
 * Get All Leaves (Scoped to requesting user role)
 * - AGENT: sees only leave applications of workers assigned to this agent
 * - WORKER: sees only own leave applications
 * - SUPER_AGENT: sees all leave applications across system
 */
const getAllLeaves = async (reqUser) => {
    const where = {};
    if (reqUser?.role === "SUPER_AGENT") {
        where.worker = {
            OR: [
                { role: { in: ["AGENT", "CUSTOMER_SUPPORT"] } },
                { designation: { contains: "Support", mode: "insensitive" } },
                { designation: { contains: "Agent", mode: "insensitive" } }
            ]
        };
    }
    else if (reqUser?.role === "AGENT") {
        where.worker = {
            assignedAgentId: reqUser.id,
        };
    }
    else if (reqUser?.role === "WORKER") {
        where.workerId = reqUser.id;
    }
    return prisma_1.default.leave.findMany({
        where,
        include: {
            worker: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    role: true,
                    assignedAgentId: true,
                },
            },
            approvedBy: {
                select: {
                    id: true,
                    name: true,
                    role: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};
exports.getAllLeaves = getAllLeaves;
/*
 * Get Pending Leaves for Agent
 */
const getPendingLeaves = async (agentId) => {
    return prisma_1.default.leave.findMany({
        where: {
            status: client_1.LeaveStatus.PENDING,
            worker: {
                assignedAgentId: agentId,
            },
        },
        include: {
            worker: true,
        },
    });
};
exports.getPendingLeaves = getPendingLeaves;
/*
 * Approve Leave (Agent can approve only assigned worker's leave; Super Agent can approve any)
 */
const approveLeave = async (leaveId, agentId, reqUserRole) => {
    const leave = await prisma_1.default.leave.findUnique({
        where: {
            id: leaveId,
        },
        include: {
            worker: true,
        },
    });
    if (!leave) {
        throw new Error("Leave not found");
    }
    if (reqUserRole === "AGENT" && leave.worker.assignedAgentId !== agentId) {
        throw new Error("You can only approve leave requests for workers assigned under your supervision");
    }
    if (leave.status !== client_1.LeaveStatus.PENDING) {
        throw new Error("Leave has already been processed");
    }
    const updated = await prisma_1.default.leave.update({
        where: {
            id: leaveId,
        },
        data: {
            status: client_1.LeaveStatus.APPROVED,
            approvedById: agentId,
        },
        include: {
            worker: true,
        },
    });
    (0, socket_1.emitLeaveUpdate)(updated);
    (0, notification_service_1.createNotification)({
        userId: updated.workerId,
        title: "Leave Request Approved",
        message: `Your leave request from ${new Date(updated.fromDate).toLocaleDateString()} to ${new Date(updated.toDate).toLocaleDateString()} has been approved.`,
        type: "LEAVE",
    }).catch(() => { });
    return updated;
};
exports.approveLeave = approveLeave;
/*
 * Reject Leave (Agent can reject only assigned worker's leave; Super Agent can reject any)
 */
const rejectLeave = async (leaveId, agentId, reqUserRole) => {
    const leave = await prisma_1.default.leave.findUnique({
        where: {
            id: leaveId,
        },
        include: {
            worker: true,
        },
    });
    if (!leave) {
        throw new Error("Leave not found");
    }
    if (reqUserRole === "AGENT" && leave.worker.assignedAgentId !== agentId) {
        throw new Error("You can only reject leave requests for workers assigned under your supervision");
    }
    if (leave.status !== client_1.LeaveStatus.PENDING) {
        throw new Error("Leave has already been processed");
    }
    const updated = await prisma_1.default.leave.update({
        where: {
            id: leaveId,
        },
        data: {
            status: client_1.LeaveStatus.REJECTED,
            approvedById: agentId,
        },
        include: {
            worker: true,
        },
    });
    (0, socket_1.emitLeaveUpdate)(updated);
    (0, notification_service_1.createNotification)({
        userId: updated.workerId,
        title: "Leave Request Rejected",
        message: `Your leave request from ${new Date(updated.fromDate).toLocaleDateString()} to ${new Date(updated.toDate).toLocaleDateString()} has been rejected.`,
        type: "LEAVE",
    }).catch(() => { });
    return updated;
};
exports.rejectLeave = rejectLeave;
