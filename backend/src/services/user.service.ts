import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/hash";
import { createNotification } from "./notification.service";

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  siteId: true,
  site: {
    select: {
      id: true,
      siteName: true,
      siteCode: true,
    },
  },
  assignedAgentId: true,
  assignedAgent: {
    select: {
      id: true,
      name: true,
      employeeCode: true,
    },
  },
  employeeCode: true,
  designation: true,
  joiningDate: true,
  salary: true,
  profileImage: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

/*
 * Get all users with optional role filter
 */
export async function getAllUsers(role?: string) {
  const where: any = {};
  if (role) {
    where.role = role as UserRole;
  }
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
}

/*
 * Get user by ID
 */
export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

/*
 * Update user
 */
export async function updateUser(id: number, data: any, reqUser?: { id: number; role: string }) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, password: true, siteId: true },
  });
  if (!user) {
    throw new Error("User not found");
  }
  if (reqUser && reqUser.id !== id) {
    if (reqUser.role === UserRole.SUPER_AGENT && user.role === UserRole.WORKER) {
      throw new Error("Super Agents cannot modify worker information");
    }
    if (reqUser.role === UserRole.WORKER) {
      throw new Error("Workers can only update their own profile and password");
    }
  }
  const updatePayload = { ...data };
  if (updatePayload.avatar) {
    updatePayload.profileImage = updatePayload.avatar;
    delete updatePayload.avatar;
  }
  delete updatePayload.bonus;
  delete updatePayload.allowances;
  delete updatePayload.netSalary;
  delete updatePayload.category;
  delete updatePayload.numericId;

  if (updatePayload.salary !== undefined && updatePayload.salary !== null) {
    updatePayload.salary = Number(updatePayload.salary);
  }
  if (updatePayload.status && typeof updatePayload.status === 'string') {
    const s = updatePayload.status.toUpperCase();
    if (['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(s)) {
      updatePayload.status = s as any;
    } else {
      delete updatePayload.status;
    }
  }

  if (updatePayload.newPassword) {
    if (updatePayload.currentPassword) {
      const isMatch = await comparePassword(updatePayload.currentPassword, user.password);
      if (!isMatch) {
        throw new Error("Invalid current password");
      }
    }
    updatePayload.password = await hashPassword(updatePayload.newPassword);
    delete updatePayload.currentPassword;
    delete updatePayload.newPassword;
    delete updatePayload.confirmPassword;
  } else if (updatePayload.password) {
    updatePayload.password = await hashPassword(updatePayload.password);
  }

  if (updatePayload.siteId && Number(updatePayload.siteId) !== user.siteId) {
    prisma.site.findUnique({ where: { id: Number(updatePayload.siteId) } }).then((site) => {
      if (site) {
        createNotification({
          userId: id,
          title: "New Working Site Assigned",
          message: `You have been assigned to site: ${site.siteName} (${site.siteCode}).`,
          type: "SITE"
        }).catch(() => {});
      }
    }).catch(() => {});
  }

  return prisma.user.update({
    where: { id },
    data: updatePayload,
    select: userSelect,
  });
}

/*
 * Delete user
 */
export async function deleteUser(id: number, reqUser?: { id: number; role: string }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("User not found");
  }
  if (reqUser?.role === UserRole.SUPER_AGENT && user.role === UserRole.WORKER) {
    throw new Error("Super Agents cannot remove worker records");
  }

  return prisma.$transaction(async (tx) => {
    // 1. Unassign tickets handled by this agent
    await tx.supportTicket.updateMany({
      where: { handledById: id },
      data: { handledById: null }
    });

    // 2. Unassign workers assigned to this agent
    await tx.user.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null }
    });

    // 3. Clear created sites reference
    await tx.site.updateMany({
      where: { createdById: id },
      data: { createdById: reqUser?.id && reqUser.id !== id ? reqUser.id : 1 }
    }).catch(() => {});

    // 4. Delete user's attendance logs
    await tx.attendance.deleteMany({
      where: { OR: [{ workerId: id }, { markedById: id }] }
    });

    // 5. Delete user's leave requests
    await tx.leave.deleteMany({
      where: { OR: [{ workerId: id }, { approvedById: id }] }
    });

    // 6. Delete user's wallet transactions & wallet
    const userWallet = await tx.wallet.findUnique({ where: { workerId: id } });
    if (userWallet) {
      await tx.walletTransaction.deleteMany({
        where: { walletId: userWallet.id }
      });
      await tx.wallet.delete({
        where: { id: userWallet.id }
      });
    }

    // 7. Delete user's payments
    await tx.payment.deleteMany({
      where: { workerId: id }
    });

    // 8. Delete user's insurance
    await tx.insurance.deleteMany({
      where: { workerId: id }
    });

    // 9. Delete user's disbursement requests
    await tx.disbursementRequest.deleteMany({
      where: { OR: [{ agentId: id }, { workerId: id }] }
    });

    // 10. Delete user's ticket comments
    await tx.supportTicketComment.deleteMany({
      where: { authorId: id }
    });

    // 11. Delete user's support tickets created by user
    await tx.supportTicket.deleteMany({
      where: { workerId: id }
    });

    // 12. Delete user's notifications
    await tx.notification.deleteMany({
      where: { userId: id }
    });

    // 13. Delete user record
    return tx.user.delete({
      where: { id },
      select: userSelect,
    });
  });
}

/*
 * Get workers filtered by requesting user role:
 * - AGENT & SUPER_AGENT: sees all workers across the system
 * - WORKER: sees own profile / co-workers under same agent
 */
export async function getWorkers(reqUser?: { id: number; role: string }) {
  const where: any = { role: UserRole.WORKER };

  if (reqUser?.role === UserRole.WORKER) {
    const currentUser = await prisma.user.findUnique({
      where: { id: reqUser.id },
      select: { assignedAgentId: true }
    });

    if (currentUser?.assignedAgentId) {
      where.OR = [
        { id: reqUser.id },
        { assignedAgentId: currentUser.assignedAgentId }
      ];
    } else {
      where.id = reqUser.id;
    }
  }

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
}

/*
 * Get all agents along with their assigned workers list
 */
export async function getAgents() {
  return prisma.user.findMany({
    where: { role: UserRole.AGENT },
    orderBy: { createdAt: "desc" },
    select: {
      ...userSelect,
      workers: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
          site: {
            select: {
              siteName: true,
            },
          },
        },
      },
    },
  });
}