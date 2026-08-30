"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayment = generatePayment;
exports.getPayments = getPayments;
exports.getPaymentById = getPaymentById;
exports.markAsPaid = markAsPaid;
exports.getWorkerPayments = getWorkerPayments;
const prisma_1 = __importDefault(require("../config/prisma"));
const client_1 = require("@prisma/client");
/*
 * Generate payment for a worker
 */
async function generatePayment(workerId, weekStart, weekEnd, basicAmount, overtimeAmount, bonus, deduction, insuranceDeduction) {
    const netAmount = basicAmount +
        overtimeAmount +
        bonus -
        deduction -
        insuranceDeduction;
    return prisma_1.default.payment.create({
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
async function getPayments() {
    return prisma_1.default.payment.findMany({
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
async function getPaymentById(id) {
    return prisma_1.default.payment.findUnique({
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
async function markAsPaid(id) {
    const payment = await prisma_1.default.payment.update({
        where: {
            id,
        },
        data: {
            status: client_1.PaymentStatus.PAID,
            paidAt: new Date(),
        },
    });
    // Check whether wallet exists
    let wallet = await prisma_1.default.wallet.findUnique({
        where: {
            workerId: payment.workerId,
        },
    });
    // Create wallet if it doesn't exist
    if (!wallet) {
        wallet = await prisma_1.default.wallet.create({
            data: {
                workerId: payment.workerId,
                balance: 0,
            },
        });
    }
    // Credit the wallet and create transaction
    await prisma_1.default.wallet.update({
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
async function getWorkerPayments(workerId) {
    return prisma_1.default.payment.findMany({
        where: {
            workerId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
