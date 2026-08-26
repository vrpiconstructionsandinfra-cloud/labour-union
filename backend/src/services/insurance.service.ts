import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import { emitInsuranceUpdate } from "../socket/socket";

/*
 * Create Insurance
 */
export async function createInsurance(data: any) {
  const memberId = Number(data.workerId || data.memberId);
  const user = await prisma.user.findUnique({
    where: {
      id: memberId,
    },
  });

  if (!user) {
    throw new Error("Worker or Agent member not found");
  }

  const existing = await prisma.insurance.findUnique({
    where: {
      workerId: memberId,
    },
  });

  if (existing) {
    throw new Error("An insurance policy already exists for this union member");
  }

  const policy = await prisma.insurance.create({
    data: {
      workerId: memberId,
      provider: data.provider || "Star Health Insurance & Union Care",
      policyNumber: data.policyNumber || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      coverageAmount: Number(data.coverageAmount) || 500000,
      premiumAmount: Number(data.premiumAmount) || 450,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  emitInsuranceUpdate(policy);
  return policy;
}

/*
 * Get All Insurance
 */
export async function getAllInsurance(reqUser?: { id: number; role: string }) {
  // Ensure all registered Workers and Agents without insurance get enrolled automatically
  const usersWithoutInsurance = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.WORKER, UserRole.AGENT] },
      insurance: null,
    },
  });

  for (const u of usersWithoutInsurance) {
    try {
      await prisma.insurance.create({
        data: {
          workerId: u.id,
          provider: "Star Health Insurance & Union Care",
          policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
          coverageAmount: 500000,
          premiumAmount: 450,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2026-12-31"),
          status: "ACTIVE",
        },
      });
    } catch (e) {
      // Ignore if concurrently created
    }
  }

  const where: any = {};
  if (reqUser?.role === "WORKER") {
    where.workerId = reqUser.id;
  } else if (reqUser?.role === "AGENT") {
    // Agents see assigned workers + self
    const myWorkerIds = (
      await prisma.user.findMany({
        where: { assignedAgentId: reqUser.id },
        select: { id: true },
      })
    ).map((w) => w.id);
    where.workerId = { in: [...myWorkerIds, reqUser.id] };
  }

  const [policies, totalMembers] = await Promise.all([
    prisma.insurance.findMany({
      where,
      include: {
        worker: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.user.count({
      where: reqUser?.role === "WORKER"
        ? { id: reqUser.id }
        : { role: { in: ["WORKER", "AGENT"] } },
    }),
  ]);

  const activePolicies = policies.filter((p) => p.status === "ACTIVE").length;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = policies.filter(
    (p) => new Date(p.endDate) <= thirtyDaysFromNow && new Date(p.endDate) >= new Date()
  ).length;

  const totalMemberCount = Math.max(totalMembers, activePolicies || 1);
  const coverageRate = Number(((activePolicies / totalMemberCount) * 100).toFixed(1));

  const maxCoverage = policies.reduce((max, p) => Math.max(max, p.coverageAmount || 500000), 500000);

  return {
    summary: {
      activePolicies: activePolicies,
      expiringSoon: expiringSoon,
      sumInsured: maxCoverage,
      coverageRate: coverageRate,
      totalWorkers: totalMemberCount,
    },
    policies,
  };
}

/*
 * Worker - My Insurance
 */
export async function getMyInsurance(workerId: number) {
  return prisma.insurance.findUnique({
    where: {
      workerId,
    },
  });
}

/*
 * Super Agent - Get Worker Insurance
 */
export async function getInsurance(workerId: number) {
  return prisma.insurance.findUnique({
    where: {
      workerId,
    },
    include: {
      worker: true,
    },
  });
}

/*
 * Update Insurance
 */
export async function updateInsurance(
  id: number,
  data: any
) {
  const insurance = await prisma.insurance.findUnique({
    where: {
      id,
    },
  });

  if (!insurance) {
    throw new Error("Insurance not found");
  }

  const updateData: any = {};
  if (data.workerId !== undefined && data.workerId !== null && data.workerId !== '') {
    updateData.workerId = Number(data.workerId);
  }
  if (data.provider !== undefined) updateData.provider = String(data.provider);
  if (data.policyNumber !== undefined) updateData.policyNumber = String(data.policyNumber);
  if (data.coverageAmount !== undefined && data.coverageAmount !== null && data.coverageAmount !== '') {
    updateData.coverageAmount = Number(data.coverageAmount);
  }
  if (data.premiumAmount !== undefined && data.premiumAmount !== null && data.premiumAmount !== '') {
    updateData.premiumAmount = Number(data.premiumAmount);
  }
  if (data.status !== undefined) updateData.status = String(data.status);
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  return prisma.insurance.update({
    where: {
      id,
    },
    data: updateData,
  });
}

/*
 * Delete Insurance
 */
export async function deleteInsurance(
  id: number
) {
  const insurance = await prisma.insurance.findUnique({
    where: {
      id,
    },
  });

  if (!insurance) {
    throw new Error("Insurance not found");
  }

  return prisma.insurance.delete({
    where: {
      id,
    },
  });
}