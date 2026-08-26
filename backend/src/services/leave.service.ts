import prisma from "../config/prisma";
import { LeaveStatus } from "@prisma/client";
import { emitLeaveUpdate } from "../socket/socket";
import { createNotification } from "./notification.service";

/*
 * Apply Leave
 */
export const applyLeave = async (
  workerId: number,
  fromDate: Date,
  toDate: Date,
  reason: string
) => {
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  if (fromDate > toDate) {
    throw new Error("From date cannot be greater than To date");
  }

  const existingLeave = await prisma.leave.findFirst({
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

  const leave = await prisma.leave.create({
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

  emitLeaveUpdate(leave);

  const isSupportRole = worker.role === "CUSTOMER_SUPPORT" || (worker as any).role === "SUPPORT_AGENT" || (worker.designation || "").toLowerCase().includes("support");
  const applicantType = isSupportRole ? "Customer Support Agent" : worker.role === "AGENT" ? "Field Agent" : "Worker";
  const fromStr = new Date(fromDate).toLocaleDateString();
  const toStr = new Date(toDate).toLocaleDateString();

  // Always notify Super Agent for every leave request
  createNotification({
    role: "SUPER_AGENT",
    title: `${applicantType} Leave Request`,
    message: `${applicantType} ${worker.name} (${worker.employeeCode || `WRK-${worker.id}`}) submitted a leave request for ${fromStr} to ${toStr}.`,
    type: "LEAVE",
  }).catch(() => {});

  // If worker has assigned agent, notify agent too
  if (worker.assignedAgentId) {
    createNotification({
      userId: worker.assignedAgentId,
      title: "Worker Leave Request",
      message: `Worker ${worker.name} submitted a leave request for ${fromStr} to ${toStr}.`,
      type: "LEAVE",
    }).catch(() => {});
  }

  return leave;
};

/*
 * Get My Leaves
 */
export const getMyLeaves = async (workerId: number) => {
  return prisma.leave.findMany({
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

/*
 * Get All Leaves (Scoped to requesting user role)
 * - AGENT: sees only leave applications of workers assigned to this agent
 * - WORKER: sees only own leave applications
 * - SUPER_AGENT: sees all leave applications across system
 */
export const getAllLeaves = async (reqUser?: { id: number; role: string }) => {
  const where: any = {};

  if (reqUser?.role === "SUPER_AGENT") {
    where.worker = {
      OR: [
        { role: { in: ["AGENT", "CUSTOMER_SUPPORT"] } },
        { designation: { contains: "Support", mode: "insensitive" } },
        { designation: { contains: "Agent", mode: "insensitive" } }
      ]
    };
  } else if (reqUser?.role === "AGENT") {
    where.worker = {
      assignedAgentId: reqUser.id,
    };
  } else if (reqUser?.role === "WORKER") {
    where.workerId = reqUser.id;
  }

  return prisma.leave.findMany({
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

/*
 * Get Pending Leaves for Agent
 */
export const getPendingLeaves = async (agentId: number) => {
  return prisma.leave.findMany({
    where: {
      status: LeaveStatus.PENDING,
      worker: {
        assignedAgentId: agentId,
      },
    },
    include: {
      worker: true,
    },
  });
};

/*
 * Approve Leave (Agent can approve only assigned worker's leave; Super Agent can approve any)
 */
export const approveLeave = async (
  leaveId: number,
  agentId: number,
  reqUserRole?: string
) => {
  const leave = await prisma.leave.findUnique({
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

  if (leave.status !== LeaveStatus.PENDING) {
    throw new Error("Leave has already been processed");
  }

  const updated = await prisma.leave.update({
    where: {
      id: leaveId,
    },
    data: {
      status: LeaveStatus.APPROVED,
      approvedById: agentId,
    },
    include: {
      worker: true,
    },
  });

  emitLeaveUpdate(updated);
  createNotification({
    userId: updated.workerId,
    title: "Leave Request Approved",
    message: `Your leave request from ${new Date(updated.fromDate).toLocaleDateString()} to ${new Date(updated.toDate).toLocaleDateString()} has been approved.`,
    type: "LEAVE",
  }).catch(() => {});
  return updated;
};

/*
 * Reject Leave (Agent can reject only assigned worker's leave; Super Agent can reject any)
 */
export const rejectLeave = async (
  leaveId: number,
  agentId: number,
  reqUserRole?: string
) => {
  const leave = await prisma.leave.findUnique({
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

  if (leave.status !== LeaveStatus.PENDING) {
    throw new Error("Leave has already been processed");
  }

  const updated = await prisma.leave.update({
    where: {
      id: leaveId,
    },
    data: {
      status: LeaveStatus.REJECTED,
      approvedById: agentId,
    },
    include: {
      worker: true,
    },
  });

  emitLeaveUpdate(updated);
  createNotification({
    userId: updated.workerId,
    title: "Leave Request Rejected",
    message: `Your leave request from ${new Date(updated.fromDate).toLocaleDateString()} to ${new Date(updated.toDate).toLocaleDateString()} has been rejected.`,
    type: "LEAVE",
  }).catch(() => {});
  return updated;
};