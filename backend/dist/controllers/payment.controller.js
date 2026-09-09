"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.getWorkerPayments = exports.markAsPaid = exports.getPaymentById = exports.getPayments = exports.generatePayment = void 0;
const paymentService = __importStar(require("../services/payment.service"));
const payment_validator_1 = require("../validators/payment.validator");
/*
 * Generate Payment
 */
const generatePayment = async (req, res) => {
    try {
        const body = payment_validator_1.paymentSchema.parse(req.body);
        const payment = await paymentService.generatePayment(body.workerId, body.weekStart, body.weekEnd, body.basicAmount, body.overtimeAmount, body.bonus, body.deduction, body.insuranceDeduction);
        res.status(201).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to generate payment",
        });
    }
};
exports.generatePayment = generatePayment;
/*
 * Get All Payments
 */
const getPayments = async (req, res) => {
    try {
        const payments = await paymentService.getPayments();
        res.json({
            success: true,
            data: payments,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payments",
        });
    }
};
exports.getPayments = getPayments;
/*
 * Get Payment By ID
 */
const getPaymentById = async (req, res) => {
    try {
        const payment = await paymentService.getPaymentById(Number(req.params.id));
        res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment",
        });
    }
};
exports.getPaymentById = getPaymentById;
/*
 * Mark Payment as Paid
 */
const markAsPaid = async (req, res) => {
    try {
        const payment = await paymentService.markAsPaid(Number(req.params.id));
        res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to update payment",
        });
    }
};
exports.markAsPaid = markAsPaid;
/*
 * Worker Payment History
 */
const getWorkerPayments = async (req, res) => {
    try {
        const payments = await paymentService.getWorkerPayments(Number(req.params.workerId));
        res.json({
            success: true,
            data: payments,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch worker payments",
        });
    }
};
exports.getWorkerPayments = getWorkerPayments;
const razorpayService = __importStar(require("../services/razorpay.service"));
/*
 * Create Razorpay Order (Standard Web Checkout)
 * POST /api/create-order or /api/payments/create-order or /api/payments/razorpay-order
 */
const createRazorpayOrder = async (req, res) => {
    try {
        const { currency = "INR", receipt, notes } = req.body;
        let amountInPaise;
        if (req.body.amountInPaise !== undefined) {
            amountInPaise = Math.round(Number(req.body.amountInPaise));
        }
        else if (req.body.amountInINR !== undefined) {
            amountInPaise = Math.round(Number(req.body.amountInINR) * 100);
        }
        else if (req.body.amount !== undefined) {
            const raw = Number(req.body.amount);
            // If amount is passed in INR (e.g., 500 -> 50000 paise) or directly in paise
            // If raw < 100, treat as INR (e.g. ₹5 = 500 paise, ₹1 = 100 paise)
            if (raw > 0 && raw < 100) {
                amountInPaise = Math.round(raw * 100);
            }
            else {
                amountInPaise = Math.round(raw);
            }
        }
        else {
            // Default fallback 500 INR = 50000 paise
            amountInPaise = 50000;
        }
        if (isNaN(amountInPaise) || amountInPaise < 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount. Minimum amount must be at least 100 paise (₹1.00)",
            });
        }
        const order = await razorpayService.createRazorpayOrder({
            amount: amountInPaise,
            currency,
            receipt: receipt || `rcpt_${Date.now()}`,
            notes,
        });
        return res.status(200).json({
            success: true,
            order_id: order.order_id,
            orderId: order.order_id,
            id: order.order_id,
            amount: order.amount,
            currency: order.currency,
            key_id: order.key_id,
            keyId: order.key_id,
            receipt: order.receipt,
        });
    }
    catch (error) {
        console.error("❌ Razorpay Create Order Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create Razorpay order",
        });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
/*
 * Verify Razorpay Payment Signature
 * POST /api/verify-payment or /api/payments/verify-payment
 */
const verifyRazorpayPayment = async (req, res) => {
    try {
        const order_id = req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
        const payment_id = req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
        const signature = req.body.razorpay_signature || req.body.signature;
        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
            });
        }
        const isValid = razorpayService.verifyRazorpaySignature({
            order_id,
            payment_id,
            signature,
        });
        if (!isValid) {
            console.warn(`⚠️ Razorpay signature mismatch for order: ${order_id}, payment: ${payment_id}`);
            return res.status(400).json({
                success: false,
                message: "Payment verification failed: Signature mismatch",
            });
        }
        console.log(`✅ Razorpay payment verified successfully: order=${order_id}, payment=${payment_id}`);
        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            order_id,
            payment_id,
            razorpay_order_id: order_id,
            razorpay_payment_id: payment_id,
        });
    }
    catch (error) {
        console.error("❌ Razorpay Verify Payment Error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify payment",
        });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
