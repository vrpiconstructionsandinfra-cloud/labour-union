import { Request, Response } from "express";
import * as sitePaymentService from "../services/sitePayment.service";

/**
 * Record a new site payment
 * POST /api/site-payments
 */
export const createSitePaymentHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      amount,
      paymentMethod,
      siteId,
      upiTransactionId,
      transactionId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      remarks
    } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid payment amount is required" });
    }

    if (!siteId) {
      return res.status(400).json({ message: "Project Site ID is required" });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment Method is required (UPI, QR_CODE, CARD, RAZORPAY)" });
    }

    const payment = await sitePaymentService.createSitePayment({
      amount: Number(amount),
      paymentMethod,
      siteId: Number(siteId),
      payerId: Number(user.id),
      payerRole: user.role,
      upiTransactionId,
      transactionId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
      remarks
    });

    res.status(201).json({
      success: true,
      message: "Site payment recorded successfully",
      data: payment
    });
  } catch (err: any) {
    console.error("❌ Create Site Payment Error:", err.message || err);
    res.status(400).json({
      success: false,
      message: err.message || "Failed to record site payment"
    });
  }
};

/**
 * Fetch list of site payments with filtering
 * GET /api/site-payments
 */
export const getSitePaymentsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      siteId,
      agentId,
      paymentMethod,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const payments = await sitePaymentService.getSitePayments(user, {
      siteId: siteId ? Number(siteId) : undefined,
      agentId: agentId ? Number(agentId) : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
      status: status ? String(status) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      search: search ? String(search) : undefined
    });

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (err: any) {
    console.error("❌ Get Site Payments Error:", err.message || err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch site payments"
    });
  }
};

/**
 * Export Site Payments Audit Report Excel
 * GET /api/site-payments/export-excel
 */
export const exportSitePaymentsExcelHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      siteId,
      agentId,
      paymentMethod,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const buffer = await sitePaymentService.exportSitePaymentsExcel(user, {
      siteId: siteId ? Number(siteId) : undefined,
      agentId: agentId ? Number(agentId) : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod) : undefined,
      status: status ? String(status) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      search: search ? String(search) : undefined
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Site_Payments_Audit_Report_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error("❌ Export Site Payments Excel Error:", err.message || err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to generate site payments Excel report"
    });
  }
};
