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