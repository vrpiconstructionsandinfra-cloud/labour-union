import { Request, Response } from "express";
import * as paymentService from "../services/payment.service";
import { paymentSchema } from "../validators/payment.validator";

/*
 * Generate Payment
 */
export const generatePayment = async (
  req: Request,
  res: Response
) => {
  try {
    const body = paymentSchema.parse(req.body);

    const payment = await paymentService.generatePayment(
      body.workerId,
      body.weekStart,
      body.weekEnd,
      body.basicAmount,
      body.overtimeAmount,
      body.bonus,
      body.deduction,
      body.insuranceDeduction
    );

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to generate payment",
    });
  }
};

/*
 * Get All Payments
 */
export const getPayments = async (
  req: Request,
  res: Response
) => {
  try {
    const payments = await paymentService.getPayments();

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

/*
 * Get Payment By ID
 */
export const getPaymentById = async (
  req: Request,
  res: Response
) => {
  try {
    const payment = await paymentService.getPaymentById(
      Number(req.params.id)
    );

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
    });
  }
};

/*
 * Mark Payment as Paid
 */
export const markAsPaid = async (
  req: Request,
  res: Response
) => {
  try {
    const payment = await paymentService.markAsPaid(
      Number(req.params.id)
    );

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update payment",
    });
  }
};

/*
 * Worker Payment History
 */
export const getWorkerPayments = async (
  req: Request,
  res: Response
) => {
  try {
    const payments =
      await paymentService.getWorkerPayments(
        Number(req.params.workerId)
      );

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch worker payments",
    });
  }
};

import * as razorpayService from "../services/razorpay.service";

/*
 * Create Razorpay Order (Standard Web Checkout)
 * POST /api/create-order or /api/payments/create-order or /api/payments/razorpay-order
 */
export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { currency = "INR", receipt, notes } = req.body;
    let amountInPaise: number;

    if (req.body.amountInPaise !== undefined) {
      amountInPaise = Math.round(Number(req.body.amountInPaise));
    } else if (req.body.amountInINR !== undefined) {
      amountInPaise = Math.round(Number(req.body.amountInINR) * 100);
    } else if (req.body.amount !== undefined) {
      const raw = Number(req.body.amount);
      // If amount is passed in INR (e.g., 500 -> 50000 paise) or directly in paise
      // If raw < 100, treat as INR (e.g. ₹5 = 500 paise, ₹1 = 100 paise)
      if (raw > 0 && raw < 100) {
        amountInPaise = Math.round(raw * 100);
      } else {
        amountInPaise = Math.round(raw);
      }
    } else {
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
  } catch (error: any) {
    console.error("❌ Razorpay Create Order Error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
};

/*
 * Verify Razorpay Payment Signature
 * POST /api/verify-payment or /api/payments/verify-payment
 */
export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const order_id =
      req.body.razorpay_order_id || req.body.order_id || req.body.orderId;
    const payment_id =
      req.body.razorpay_payment_id || req.body.payment_id || req.body.paymentId;
    const signature =
      req.body.razorpay_signature || req.body.signature;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
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
  } catch (error: any) {
    console.error("❌ Razorpay Verify Payment Error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};