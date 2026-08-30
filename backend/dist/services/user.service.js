"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = getAllUsers;
exports.getUserById = getUserById;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.getWorkers = getWorkers;
exports.getAgents = getAgents;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
const hash_1 = require("../utils/hash");
const notification_service_1 = require("./notification.service");
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
async function getAllUsers(role) {
    const where = {};
    if (role) {
        where.role = role;
    }
    return prisma_1.default.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: userSelect,
    });
}
/*
 * Get user by ID
 */
async function getUserById(id) {
    return prisma_1.default.user.findUnique({
        where: { id },
        select: userSelect,
    });
}
/*
 * Update user
 */
async function updateUser(id, data, reqUser) {
    const user = await prisma_1.default.user.findUnique({
        where: { id },
        select: { id: true, role: true, password: true, siteId: true },
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (reqUser && reqUser.id !== id) {
        if (reqUser.role === client_1.UserRole.SUPER_AGENT && user.role === client_1.UserRole.WORKER) {
            throw new Error("Super Agents cannot modify worker information");
        }
        if (reqUser.role === client_1.UserRole.WORKER) {
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
            updatePayload.status = s;
        }
        else {
            delete updatePayload.status;
        }
    }
    if (updatePayload.newPassword) {
        if (updatePayload.currentPassword) {
            const isMatch = await (0, hash_1.comparePassword)(updatePayload.currentPassword, user.password);
            if (!isMatch) {
                throw new Error("Invalid current password");
            }
        }
        updatePayload.password = await (0, hash_1.hashPassword)(updatePayload.newPassword);
        delete updatePayload.currentPassword;
        delete updatePayload.newPassword;
        delete updatePayload.confirmPassword;
    }
    else if (updatePayload.password) {
        updatePayload.password = await (0, hash_1.hashPassword)(updatePayload.password);
    }
    if (updatePayload.siteId && Number(updatePayload.siteId) !== user.siteId) {
        prisma_1.default.site.findUnique({ where: { id: Number(updatePayload.siteId) } }).then((site) => {
            if (site) {
                (0, notification_service_1.createNotification)({
                    userId: id,
                    title: "New Working Site Assigned",
                    message: `You have been assigned to site: ${site.siteName} (${site.siteCode}).`,
                    type: "SITE"
                }).catch(() => { });
            }
        }).catch(() => { });
    }
    return prisma_1.default.user.update({
        where: { id },
        data: updatePayload,
        select: userSelect,
    });
}
/*
 * Delete user
 */
async function deleteUser(id, reqUser) {
    const user = await prisma_1.default.user.findUnique({ where: { id } });
    if (!user) {
        throw new Error("User not found");
    }
    if (reqUser?.role === client_1.UserRole.SUPER_AGENT && user.role === client_1.UserRole.WORKER) {
        throw new Error("Super Agents cannot remove worker records");
    }
    return prisma_1.default.$transaction(async (tx) => {
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
        }).catch(() => { });
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
async function getWorkers(reqUser) {
    const where = { role: client_1.UserRole.WORKER };
    if (reqUser?.role === client_1.UserRole.WORKER) {
        const currentUser = await prisma_1.default.user.findUnique({
            where: { id: reqUser.id },
            select: { assignedAgentId: true }
        });
        if (currentUser?.assignedAgentId) {
            where.OR = [
                { id: reqUser.id },
                { assignedAgentId: currentUser.assignedAgentId }
            ];
        }
        else {
            where.id = reqUser.id;
        }
    }
    return prisma_1.default.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: userSelect,
    });
}
/*
 * Get all agents along with their assigned workers list
 */
async function getAgents() {
    return prisma_1.default.user.findMany({
        where: { role: { in: [client_1.UserRole.AGENT, client_1.UserRole.CUSTOMER_SUPPORT] } },
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
