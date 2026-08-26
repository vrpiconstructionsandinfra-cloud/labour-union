import { Request, Response } from "express";
import * as payrollService from "../services/payroll.service";

/*
 * Generate Payroll (Scoped to logged-in user role)
 */
export async function generatePayroll(
  req: Request,
  res: Response
) {
  try {
    const {
      workerId,
      weekStart,
      weekEnd,
    } = req.body;

    const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;

    const payrolls = await payrollService.generateBulkPayroll(
      reqUser,
      workerId ? Number(workerId) : null,
      weekStart ? new Date(weekStart) : undefined,
      weekEnd ? new Date(weekEnd) : undefined
    );

    res.status(201).json({
      success: true,
      message: "Payroll generated successfully",
      data: payrolls,
    });
  } catch (error: any) {
    console.error("Payroll Error:", error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get All Payrolls (Scoped to logged-in user role)
 */
export async function getPayrolls(
  req: Request,
  res: Response
) {
  try {
    const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const payrolls = await payrollService.getPayrolls(reqUser);

    res.json({
      success: true,
      data: payrolls,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get Payroll By ID
 */
export async function getPayrollById(
  req: Request,
  res: Response
) {
  try {
    const payroll = await payrollService.getPayrollById(
      Number(req.params.id)
    );

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payroll not found",
      });
    }

    res.json({
      success: true,
      data: payroll,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}