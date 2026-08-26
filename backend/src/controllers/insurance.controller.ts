import { Request, Response } from "express";
import * as insuranceService from "../services/insurance.service";
import { insuranceSchema } from "../validators/insurance.validator";

/*
 * Create Insurance
 */
export async function createInsurance(
  req: Request,
  res: Response
) {
  try {
    const body = insuranceSchema.parse(req.body);

    const insurance =
      await insuranceService.createInsurance(body);

    res.status(201).json({
      success: true,
      message: "Insurance created successfully",
      data: insurance,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get All Insurance
 */
export async function getAllInsurance(
  req: Request,
  res: Response
) {
  try {
    const data =
      await insuranceService.getAllInsurance((req as any).user);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Worker - My Insurance
 */
export async function getMyInsurance(
  req: Request,
  res: Response
) {
  try {
    const data =
      await insuranceService.getMyInsurance(
        req.user!.id
      );

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Super Agent - Worker Insurance
 */
export async function getWorkerInsurance(
  req: Request,
  res: Response
) {
  try {
    const data =
      await insuranceService.getInsurance(
        Number(req.params.workerId)
      );

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Update Insurance
 */
export async function updateInsurance(
  req: Request,
  res: Response
) {
  try {
    const data =
      await insuranceService.updateInsurance(
        Number(req.params.id),
        req.body
      );

    res.json({
      success: true,
      message: "Insurance updated successfully",
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Delete Insurance
 */
export async function deleteInsurance(
  req: Request,
  res: Response
) {
  try {
    await insuranceService.deleteInsurance(
      Number(req.params.id)
    );

    res.json({
      success: true,
      message: "Insurance deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}