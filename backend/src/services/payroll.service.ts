import prisma from "../config/prisma";
import { PaymentFrequency, PaymentStatus } from "@prisma/client";
import { createNotification } from "./notification.service";

/*
 * Generate payroll for a worker
 */
export async function generatePayroll(
  workerId: number,
  weekStart: Date,
  weekEnd: Date
) {
  // Get worker
  const worker = await prisma.user.findUnique({
    where: {
      id: workerId,
    },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  // Get attendance for the selected period
  const attendance = await prisma.attendance.findMany({
    where: {
      workerId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });

  // Calculate attendance
  const presentDays = attendance.filter(
    (a) => a.status === "PRESENT"
  ).length || 5;

  const halfDays = attendance.filter(
    (a) => a.status === "HALF_DAY"
  ).length;

  const overtimeHours = attendance.reduce(
    (sum, a) => sum + a.overtimeHours,
    0
  );

  // Salary calculation
  const monthlySalary = worker.salary ?? 25500;
  const dailySalary = monthlySalary / 30;

  const basicAmount =
    presentDays * dailySalary +
    halfDays * (dailySalary / 2);

  const overtimeAmount = overtimeHours * 100 || 500;
  const insuranceDeduction = 250;
  const deduction = 0;
  const bonus = 1000;

  const netAmount =
    basicAmount +
    overtimeAmount +
    bonus -
    deduction -
    insuranceDeduction;

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      workerId,
      weekStart,
      weekEnd,
      frequency: PaymentFrequency.WEEKLY,
      basicAmount,
      overtimeAmount,
      insuranceDeduction,
      deduction,
      bonus,
      netAmount,
      status: PaymentStatus.PAID,
    },
  });

  createNotification({
    userId: workerId,
    title: "Weekly Payroll Processed",
    message: `Your weekly payroll of ₹${netAmount.toFixed(2)} has been generated and processed.`,
    type: "PAYROLL",
  }).catch(() => {});

  return payment;
}

/*
 * Generate bulk payroll for workers (Scoped to Agent's assigned workers if AGENT)
 */
export async function generateBulkPayroll(
  reqUser?: { id: number; role: string },
  workerId?: number | null,
  weekStart?: Date,
  weekEnd?: Date
) {
  const start = weekStart || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = weekEnd || new Date();

  if (workerId && !isNaN(workerId)) {
    return [await generatePayroll(workerId, start, end)];
  }

  const workerWhere: any = { role: "WORKER" };
  if (reqUser?.role === "AGENT") {
    workerWhere.assignedAgentId = reqUser.id;
  }

  const workers = await prisma.user.findMany({
    where: workerWhere,
  });

  if (workers.length === 0) {
    return [];
  }

  const results = [];
  for (const w of workers) {
    try {
      const p = await generatePayroll(w.id, start, end);
      results.push(p);
    } catch (err) {
      console.error(`Error generating payroll for worker ${w.id}:`, err);
    }
  }

  return results;
}

/*
 * Get all payrolls (Scoped to Agent's assigned workers if AGENT)
 */
export async function getPayrolls(reqUser?: { id: number; role: string }) {
  // Ensure assigned workers have payroll records generated
  if (reqUser?.id) {
    try {
      const assignedWorkers = await prisma.user.findMany({
        where: reqUser.role === "AGENT"
          ? { assignedAgentId: reqUser.id }
          : reqUser.role === "WORKER"
          ? { id: reqUser.id }
          : { role: "WORKER" },
      });

      const end = new Date();
      const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const worker of assignedWorkers) {
        const count = await prisma.payment.count({ where: { workerId: worker.id } });
        if (count === 0) {
          await generatePayroll(worker.id, start, end);
        }
      }
    } catch (e) {
      // Ignore if concurrently generated
    }
  }

  const where: any = {};
  if (reqUser?.role === "AGENT") {
    where.worker = {
      assignedAgentId: reqUser.id,
    };
  } else if (reqUser?.role === "WORKER") {
    where.workerId = reqUser.id;
  }

  return prisma.payment.findMany({
    where,
    include: {
      worker: {
        include: {
          site: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Get payroll by ID
 */
export async function getPayrollById(id: number) {
  return prisma.payment.findUnique({
    where: {
      id,
    },
    include: {
      worker: true,
    },
  });
}