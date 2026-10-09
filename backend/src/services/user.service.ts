import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import { hashPassword, comparePassword } from "../utils/hash";
import { createNotification } from "./notification.service";
import { memoryCache } from "../utils/cache";

export function invalidateUserCache(): void {
  memoryCache.delPrefix("users_");
  memoryCache.delPrefix("dashboard_");
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
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
  assignedAdminId: true,
  assignedAdmin: {
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
  bankAccountNo: true,
  ifscCode: true,
  address: true,
  registrationAmount: true,
  paymentMethod: true,
  razorpayPaymentId: true,
  razorpayOrderId: true,
  upiTransactionId: true,
  createdAt: true,
  updatedAt: true,
};

/*
 * Get all users with optional role filter
 */
export async function getAllUsers(role?: string, reqUser?: { id: number; role: string }) {
  const cacheKey = `users_all_${role || 'all'}_${reqUser?.id || 'all'}_${reqUser?.role || 'all'}`;
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const where: any = {};
  if (role) {
    where.role = role as UserRole;
  }

  if (reqUser?.role === UserRole.AGENT) {
    if (role === UserRole.WORKER) {
      where.assignedAgentId = reqUser.id;
    }
  }
  // Note: SUPER_AGENT and ADMIN see all users, workers and agents across the organization without restriction

  const result = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });

  memoryCache.set(cacheKey, result, 15);
  return result;
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
    select: { id: true, role: true, password: true, siteId: true, assignedAgentId: true },
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
    if (reqUser.role === UserRole.ADMIN) {
      if (user.role === UserRole.SUPER_AGENT || user.role === UserRole.ADMIN) {
        throw new Error("Forbidden: Admins cannot modify other administrative accounts");
      }
      // Admins are authorized to modify any field agent and worker
    }
    if (reqUser.role === UserRole.AGENT) {
      if (user.role !== UserRole.WORKER || user.assignedAgentId !== reqUser.id) {
        throw new Error("Forbidden: You can only modify workers assigned under your supervision");
      }
    }
  }
  const updatePayload = { ...data };
  if (reqUser && reqUser.role === UserRole.ADMIN) {
    // Prevent Admin self-privilege-escalation on financial or status fields
    delete updatePayload.salary;
    delete updatePayload.active;
    delete updatePayload.status;
    delete updatePayload.role;
  }
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

  const updated = await prisma.user.update({
    where: { id },
    data: updatePayload,
    select: userSelect,
  });

  invalidateUserCache();
  return updated;
}

/*
 * Delete user
 */
export async function deleteUser(id: number, reqUser?: { id: number; role: string }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === UserRole.SUPER_AGENT) {
    throw new Error("Super Agent account cannot be deleted.");
  }

  // Hierarchical authorization check
  if (reqUser && reqUser.role === UserRole.ADMIN) {
    if (user.role === UserRole.ADMIN) {
      throw new Error("Forbidden: Admins cannot delete administrative accounts");
    }
    // Admins are authorized to delete agents and workers across the system
  }
  if (reqUser && reqUser.role === UserRole.AGENT) {
    if (user.role !== UserRole.WORKER || user.assignedAgentId !== reqUser.id) {
      throw new Error("Forbidden: You can only delete workers assigned to your agent account");
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Parallelize all independent cascade cleanups
      await Promise.all([
        // Unassign tickets handled by this agent
        tx.supportTicket.updateMany({
          where: { handledById: id },
          data: { handledById: null },
        }).catch(() => {}),

        // Unassign workers assigned to this agent
        tx.user.updateMany({
          where: { assignedAgentId: id },
          data: { assignedAgentId: null },
        }).catch(() => {}),

        // Unassign agents under this admin (if an admin is deleted)
        tx.user.updateMany({
          where: { assignedAdminId: id },
          data: { assignedAdminId: null },
        }).catch(() => {}),

        // Unassign agents managed by this support agent
        tx.user.updateMany({
          where: { managedBySupportId: id },
          data: { managedBySupportId: null },
        }).catch(() => {}),

        // Clear created sites reference
        tx.site.updateMany({
          where: { createdById: id },
          data: { createdById: reqUser?.id && reqUser.id !== id ? reqUser.id : 1 },
        }).catch(() => {}),

        // Delete user's attendance logs
        tx.attendance.deleteMany({
          where: { OR: [{ workerId: id }, { markedById: id }] },
        }).catch(() => {}),

        // Delete user's leave requests
        tx.leave.deleteMany({
          where: { OR: [{ workerId: id }, { approvedById: id }] },
        }).catch(() => {}),

        // Delete user's payments
        tx.payment.deleteMany({
          where: { workerId: id },
        }).catch(() => {}),

        // Delete user's insurance
        tx.insurance.deleteMany({
          where: { workerId: id },
        }).catch(() => {}),

        // Delete user's disbursement requests
        tx.disbursementRequest.deleteMany({
          where: { OR: [{ agentId: id }, { workerId: id }] },
        }).catch(() => {}),

        // Delete user's ticket comments or comments on tickets created by user
        tx.supportTicketComment.deleteMany({
          where: { OR: [{ authorId: id }, { ticket: { workerId: id } }] },
        }).catch(() => {}),

        // Delete user's support tickets created by user
        tx.supportTicket.deleteMany({
          where: { workerId: id },
        }).catch(() => {}),

        // Delete user's notifications
        tx.notification.deleteMany({
          where: { userId: id },
        }).catch(() => {}),

        // Delete worker registration incentives
        tx.workerRegistrationIncentive.deleteMany({
          where: { OR: [{ workerId: id }, { agentId: id }] },
        }).catch(() => {}),

        // Delete site assignments
        tx.siteAssignment.deleteMany({
          where: { OR: [{ agentId: id }, { assignedById: id }] },
        }).catch(() => {}),

        // Delete support agent messages
        tx.supportAgentMessage.deleteMany({
          where: { OR: [{ senderId: id }, { supportAgentId: id }, { fieldAgentId: id }] },
        }).catch(() => {}),

        // Delete site payments
        tx.sitePayment.deleteMany({
          where: { payerId: id },
        }).catch(() => {}),
      ]);

      // 2. Delete user's wallet & wallet transactions if any
      const userWallet = await tx.wallet.findUnique({ where: { workerId: id } }).catch(() => null);
      if (userWallet) {
        await tx.walletTransaction.deleteMany({
          where: { walletId: userWallet.id },
        }).catch(() => {});
        await tx.wallet.delete({
          where: { id: userWallet.id },
        }).catch(() => {});
      }

      // 3. Delete user record
      return tx.user.delete({
        where: { id },
        select: userSelect,
      });
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );

  invalidateUserCache();
  return result;
}

/*
 * Get workers filtered by requesting user role:
 * - AGENT: strictly sees only workers assigned to this agent (assignedAgentId == reqUser.id)
 * - WORKER: sees own profile / co-workers under same agent
 * - ADMIN & SUPER_AGENT: sees all workers across the organization
 */
export async function getWorkers(reqUser?: { id: number; role: string }) {
  const cacheKey = `users_workers_${reqUser?.id || 'all'}_${reqUser?.role || 'all'}`;
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

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
  } else if (reqUser?.role === UserRole.AGENT) {
    // AGENT strictly only sees workers assigned under their account! Never other agents' workers!
    where.assignedAgentId = reqUser.id;
  }
  // Note: SUPER_AGENT and ADMIN see all workers across the system!

  const result = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });

  memoryCache.set(cacheKey, result, 15);
  return result;
}

/*
 * Get agents along with their assigned workers list
 * - SUPER_AGENT & ADMIN: sees all agents across the organization
 */
export async function getAgents(reqUser?: { id: number; role: string }) {
  const cacheKey = `users_agents_${reqUser?.id || 'all'}_${reqUser?.role || 'all'}`;
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const where: any = { role: UserRole.AGENT };
  // Both SUPER_AGENT and ADMIN see all agents across the organization

  const result = await prisma.user.findMany({
    where,
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

  memoryCache.set(cacheKey, result, 15);
  return result;
}