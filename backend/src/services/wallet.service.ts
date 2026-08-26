import prisma from "../config/prisma";
import { WalletTransactionType } from "@prisma/client";
import { emitWalletUpdate } from "../socket/socket";
import { createNotification } from "./notification.service";

/*
 * Get logged-in worker wallet
 */
export async function getWallet(workerId: number) {
  return prisma.wallet.findUnique({
    where: {
      workerId,
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
}

/*
 * Get all wallets (for Admin / Super Agent / Agents)
 */
export async function getAllWallets() {
  // Ensure all workers and agents have a wallet record
  try {
    const usersWithoutWallet = await prisma.user.findMany({
      where: {
        role: { in: ["WORKER", "AGENT"] },
        wallet: null,
      },
    });

    for (const u of usersWithoutWallet) {
      await prisma.wallet.create({
        data: {
          workerId: u.id,
          balance: 0,
        },
      });
    }
  } catch (e) {
    // Ignore if concurrently created
  }

  return prisma.wallet.findMany({
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          role: true,
          employeeCode: true,
          designation: true,
          assignedAgentId: true,
          assignedAgent: {
            select: {
              id: true,
              name: true,
            },
          },
          workers: {
            select: {
              id: true,
            },
          },
        },
      },
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

/*
 * Get wallet transactions
 */
export async function getWalletHistory(workerId: number) {
  const wallet = await prisma.wallet.findUnique({
    where: {
      workerId,
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  return prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * View any worker wallet
 */
export async function getWorkerWallet(workerId: number) {
  return prisma.wallet.findUnique({
    where: {
      workerId,
    },
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          designation: true,
        },
      },
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

/*
 * Wallet Dashboard Aggregates
 */
export async function getWalletDashboard() {
  const wallets = await prisma.wallet.findMany();
  const totalWallets = wallets.length;

  const totalUserWalletsBalance = wallets.reduce(
    (sum, wallet) => sum + wallet.balance,
    0
  );

  // Master Union Treasury Fund Pool (Initial Treasury ₹ 2.5 Crore minus total disbursed wallet balances)
  const INITIAL_TREASURY_POOL = 25000000;
  const masterTreasuryBalance = Math.max(0, INITIAL_TREASURY_POOL - totalUserWalletsBalance);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayTransactions = await prisma.walletTransaction.findMany({
    where: {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  const todayCredits = todayTransactions
    .filter((t) => t.type === WalletTransactionType.CREDIT)
    .reduce((sum, t) => sum + t.amount, 0);

  const todayDebits = todayTransactions
    .filter((t) => t.type === WalletTransactionType.DEBIT)
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalWallets,
    totalBalance: masterTreasuryBalance,
    totalDisbursedToWallets: totalUserWalletsBalance,
    todayCredits,
    todayDebits,
  };
}

/*
 * Credit Wallet
 */
export async function creditWallet(
  workerId: number,
  amount: number,
  description?: string
) {
  let wallet = await prisma.wallet.findUnique({
    where: {
      workerId,
    },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        workerId,
        balance: 0,
      },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: {
        workerId,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet!.id,
        type: WalletTransactionType.CREDIT,
        amount,
        description,
      },
    });

    return updatedWallet;
  });

  emitWalletUpdate({
    workerId,
    type: "CREDIT",
    amount,
    description,
    newBalance: result.balance,
  });

  createNotification({
    userId: workerId,
    title: "Wallet Credited",
    message: `₹${amount.toFixed(2)} was credited to your wallet. (${description || "Wallet deposit"})`,
    type: "WALLET",
  }).catch(() => {});

  return result;
}

/*
 * Debit Wallet
 */
export async function debitWallet(
  workerId: number,
  amount: number,
  description?: string
) {
  const wallet = await prisma.wallet.findUnique({
    where: {
      workerId,
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: {
        workerId,
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amount,
        description,
      },
    });

    return updatedWallet;
  });

  emitWalletUpdate({
    workerId,
    type: "DEBIT",
    amount,
    description,
    newBalance: result.balance,
  });

  createNotification({
    userId: workerId,
    title: "Wallet Debited",
    message: `₹${amount.toFixed(2)} was debited from your wallet. (${description || "Wallet withdrawal"})`,
    type: "WALLET",
  }).catch(() => {});

  return result;
}

/*
 * Disburse Weekly Attendance Allowance to Workers and Agents
 */
export async function disburseWeeklyAllowance(poolAmount?: number) {
  // Query attendance records for the past 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const attendances = await prisma.attendance.findMany({
    where: {
      date: {
        gte: sevenDaysAgo,
      },
      status: {
        in: ["PRESENT", "HALF_DAY"],
      },
    },
    select: {
      workerId: true,
      status: true,
    },
  });

  // Calculate attendance days per user
  const userAttendanceMap = new Map<number, number>();
  for (const a of attendances) {
    const days = a.status === "HALF_DAY" ? 0.5 : 1;
    userAttendanceMap.set(a.workerId, (userAttendanceMap.get(a.workerId) || 0) + days);
  }

  // Get active users (Workers and Agents)
  let eligibleUsers: { id: number; name: string; role: string }[] = [];

  if (userAttendanceMap.size > 0) {
    const userIds = Array.from(userAttendanceMap.keys());
    eligibleUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
  } else {
    // Fallback: If no attendance records in past 7 days, select active Workers & Agents
    eligibleUsers = await prisma.user.findMany({
      where: {
        role: { in: ["WORKER", "AGENT"] },
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });
    for (const u of eligibleUsers) {
      userAttendanceMap.set(u.id, 5); // Default 5 attendance days
    }
  }

  const totalAttendanceDays = Array.from(userAttendanceMap.values()).reduce((a, b) => a + b, 0) || 1;

  // Determine Pool Amount: provided amount or system total pool (e.g. 62500)
  const totalPool = poolAmount && poolAmount > 0 ? poolAmount : 62500;

  const results = [];

  for (const u of eligibleUsers) {
    const userDays = userAttendanceMap.get(u.id) || 1;
    const userShare = Math.round((userDays / totalAttendanceDays) * totalPool);

    if (userShare > 0) {
      try {
        const updated = await creditWallet(
          u.id,
          userShare,
          `Weekly Attendance Allowance Disbursal (${userDays} days attended)`
        );
        results.push({
          userId: u.id,
          name: u.name,
          role: u.role,
          attendedDays: userDays,
          amountCredited: userShare,
          newBalance: updated.balance,
        });
      } catch (err) {
        console.error(`Error disbursing allowance to user ${u.id}:`, err);
      }
    }
  }

  return {
    totalPoolDisbursed: results.reduce((sum, r) => sum + r.amountCredited, 0),
    totalUsersDisbursed: results.length,
    disbursals: results,
  };
}

/*
 * Agent creates a Disbursement Request (Requires Super Agent Approval)
 */
export async function requestDisbursement(
  agentId: number,
  workerId: number,
  amount: number,
  description?: string
) {
  if (amount <= 0) {
    throw new Error("Disbursement amount must be greater than zero");
  }

  const worker = await prisma.user.findUnique({
    where: { id: workerId },
  });

  if (!worker || worker.role !== "WORKER") {
    throw new Error("Selected worker is invalid");
  }

  const request = await prisma.disbursementRequest.create({
    data: {
      agentId,
      workerId,
      amount,
      description: description || "Worker Wallet Disbursement Request",
      status: "PENDING",
    },
    include: {
      agent: {
        select: { id: true, name: true, email: true },
      },
      worker: {
        select: { id: true, name: true, employeeCode: true },
      },
    },
  });

  // Notify Super Agents of new request
  const superAgents = await prisma.user.findMany({
    where: { role: "SUPER_AGENT" },
    select: { id: true },
  });

  for (const sa of superAgents) {
    createNotification({
      userId: sa.id,
      title: "Disbursement Approval Required",
      message: `Agent ${request.agent.name} requested ₹${amount.toFixed(2)} payout for Worker ${request.worker.name}.`,
      type: "WALLET",
    }).catch(() => {});
  }

  return request;
}

/*
 * Get Disbursement Requests (Super Agent sees all, Agent sees own)
 */
export async function getDisbursementRequests(reqUser: { id: number; role: string }) {
  const where: any = {};
  if (reqUser.role === "AGENT") {
    where.agentId = reqUser.id;
  } else if (reqUser.role === "WORKER") {
    where.workerId = reqUser.id;
  }

  return prisma.disbursementRequest.findMany({
    where,
    include: {
      agent: {
        select: { id: true, name: true, email: true },
      },
      worker: {
        select: { id: true, name: true, employeeCode: true, designation: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Super Agent Approves Disbursement Request
 */
export async function approveDisbursementRequest(
  requestId: number,
  reqUser: { id: number; role: string }
) {
  if (reqUser.role !== "SUPER_AGENT") {
    throw new Error("Only Super Agents can approve wallet disbursements");
  }

  const request = await prisma.disbursementRequest.findUnique({
    where: { id: requestId },
    include: {
      agent: true,
      worker: true,
    },
  });

  if (!request) {
    throw new Error("Disbursement request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error(`Request has already been ${request.status.toLowerCase()}`);
  }

  // Credit Worker Wallet
  await creditWallet(
    request.workerId,
    request.amount,
    `Disbursement Approved: ${request.description || "Agent Allocation"}`
  );

  // Debit Agent Wallet if balance available
  try {
    const agentWallet = await prisma.wallet.findUnique({
      where: { workerId: request.agentId },
    });

    if (agentWallet && agentWallet.balance >= request.amount) {
      await debitWallet(
        request.agentId,
        request.amount,
        `Disbursement Approved for Worker ${request.worker.name}`
      );
    }
  } catch (err) {
    // Ignore agent balance debit error if initial treasury pool cover
  }

  const updatedRequest = await prisma.disbursementRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  // Notify Agent & Worker
  createNotification({
    userId: request.agentId,
    title: "Disbursement Approved",
    message: `Your requested ₹${request.amount.toFixed(2)} disbursement for Worker ${request.worker.name} was approved by Super Agent.`,
    type: "WALLET",
  }).catch(() => {});

  createNotification({
    userId: request.workerId,
    title: "Funds Received",
    message: `₹${request.amount.toFixed(2)} was credited to your wallet via Agent ${request.agent.name}.`,
    type: "WALLET",
  }).catch(() => {});

  return updatedRequest;
}

/*
 * Super Agent Rejects Disbursement Request
 */
export async function rejectDisbursementRequest(
  requestId: number,
  reqUser: { id: number; role: string }
) {
  if (reqUser.role !== "SUPER_AGENT") {
    throw new Error("Only Super Agents can reject wallet disbursements");
  }

  const request = await prisma.disbursementRequest.findUnique({
    where: { id: requestId },
    include: {
      agent: true,
      worker: true,
    },
  });

  if (!request) {
    throw new Error("Disbursement request not found");
  }

  if (request.status !== "PENDING") {
    throw new Error(`Request has already been ${request.status.toLowerCase()}`);
  }

  const updatedRequest = await prisma.disbursementRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
    include: {
      agent: { select: { id: true, name: true, email: true } },
      worker: { select: { id: true, name: true, employeeCode: true } },
    },
  });

  createNotification({
    userId: request.agentId,
    title: "Disbursement Rejected",
    message: `Your requested ₹${request.amount.toFixed(2)} disbursement for Worker ${request.worker.name} was rejected.`,
    type: "WALLET",
  }).catch(() => {});

  return updatedRequest;
}