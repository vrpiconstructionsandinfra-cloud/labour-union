import prisma from "../config/prisma";
import { PaymentStatus } from "@prisma/client";

/*
 * Generate payment for a worker
 */
export async function generatePayment(
  workerId: number,
  weekStart: string,
  weekEnd: string,
  basicAmount: number,
  overtimeAmount: number,
  bonus: number,
  deduction: number,
  insuranceDeduction: number
) {
  const netAmount =
    basicAmount +
    overtimeAmount +
    bonus -
    deduction -
    insuranceDeduction;

  return prisma.payment.create({
    data: {
      workerId,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      basicAmount,
      overtimeAmount,
      bonus,
      deduction,
      insuranceDeduction,
      netAmount,
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
 * Get all payments
 */
export async function getPayments() {
  return prisma.payment.findMany({
    include: {
      worker: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/*
 * Get payment by ID
 */
export async function getPaymentById(id: number) {
  return prisma.payment.findUnique({
    where: {
      id,
    },
    include: {
      worker: true,
    },
  });
}

/*
 * Mark payment as paid
 */
/*
 * Mark payment as paid
 */
export async function markAsPaid(id: number) {
  const payment = await prisma.payment.update({
    where: {
      id,
    },
    data: {
      status: PaymentStatus.PAID,
      paidAt: new Date(),
    },
  });

  // Check whether wallet exists
  let wallet = await prisma.wallet.findUnique({
    where: {
      workerId: payment.workerId,
    },
  });

  // Create wallet if it doesn't exist
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        workerId: payment.workerId,
        balance: 0,
      },
    });
  }

  // Credit the wallet and create transaction
  await prisma.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      balance: {
        increment: payment.netAmount,
      },
      transactions: {
        create: {
          type: "CREDIT",
          amount: payment.netAmount,
          description: "Salary credited",
        },
      },
    },
  });

  return payment;
}

/*
 * Worker payment history
 */
export async function getWorkerPayments(workerId: number) {
  return prisma.payment.findMany({
    where: {
      workerId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}