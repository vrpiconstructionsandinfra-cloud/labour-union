import { Request, Response } from "express";
import * as leaveService from "../services/leave.service";
import { leaveSchema } from "../validators/leave.validator";

/*
 * Apply Leave
 */
export const applyLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const body = leaveSchema.parse(req.body);
    const targetWorkerId = req.body.workerId ? Number(req.body.workerId) : req.user!.id;

    const leave = await leaveService.applyLeave(
      targetWorkerId,
      new Date(body.fromDate),
      new Date(body.toDate),
      body.reason
    );

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get My Leaves
 */
export const getMyLeaves = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await leaveService.getMyLeaves(req.user!.id);

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
};

/*
 * Get All Pending Leaves
 */
export const getPendingLeaves = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await leaveService.getPendingLeaves(req.user!.id);

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
};

/*
 * Approve Leave
 */
export const approveLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const reqUserRole = req.user?.role;
    const data = await leaveService.approveLeave(
      Number(req.params.id),
      req.user!.id,
      reqUserRole
    );

    res.json({
      success: true,
      message: "Leave approved successfully",
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Reject Leave
 */
export const rejectLeave = async (
  req: Request,
  res: Response
) => {
  try {
    const reqUserRole = req.user?.role;
    const data = await leaveService.rejectLeave(
      Number(req.params.id),
      req.user!.id,
      reqUserRole
    );

    res.json({
      success: true,
      message: "Leave rejected successfully",
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get All Leaves (Scoped to requesting user role)
 */
export const getAllLeaves = async (
  req: Request,
  res: Response
) => {
  try {
    const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const data = await leaveService.getAllLeaves(reqUser);

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
};