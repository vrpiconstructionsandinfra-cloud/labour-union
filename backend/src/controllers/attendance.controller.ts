import { Request, Response } from "express";
import * as attendanceService from "../services/attendance.service";
import { attendanceSchema } from "../validators/attendance.validator";

export const createAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const body = attendanceSchema.parse(req.body);

    const attendance = await attendanceService.markAttendance(
      body.workerId,
      req.user.id,
      body.date,
      body.status,
      body.overtimeHours,
      body.remarks || undefined,
      {
        statusCode: body.statusCode,
        checkInTime: body.checkInTime,
        checkOutTime: body.checkOutTime,
        checkInPhoto: body.checkInPhoto,
        checkOutPhoto: body.checkOutPhoto,
        siteId: body.siteId,
        dailyPay: body.dailyPay,
      }
    );

    return res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (err: any) {
    console.error("Error creating attendance:", err);
    return res.status(400).json({
      success: false,
      message: err?.errors?.[0]?.message || err.message || "Failed to mark attendance",
    });
  }
};

export const getAllAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const user = req.user;
    let data;

    if (user && user.role === "WORKER") {
      data = await attendanceService.getAttendanceByWorker(user.id);
    } else {
      data = await attendanceService.getAttendance();
    }

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch attendance records",
    });
  }
};

export const getWorkerAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await attendanceService.getAttendanceByWorker(
      Number(req.params.workerId)
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch worker attendance",
    });
  }
};

export const updateAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await attendanceService.updateAttendance(
      Number(req.params.id),
      req.body
    );

    return res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Error updating attendance:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update attendance",
    });
  }
};

export const deleteAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    await attendanceService.deleteAttendance(
      Number(req.params.id)
    );

    return res.json({
      success: true,
      message: "Attendance deleted",
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to delete attendance",
    });
  }
};

export const handleCheckIn = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const attendance = await attendanceService.agentCheckIn(req.user.id);
    return res.status(200).json({ success: true, data: attendance });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || "Check-in failed" });
  }
};

export const handleCheckOut = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const attendance = await attendanceService.agentCheckOut(req.user.id);
    return res.status(200).json({ success: true, data: attendance });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || "Check-out failed" });
  }
};

export const getTodayAttendanceStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const attendance = await attendanceService.getTodayAgentAttendance(req.user.id);
    return res.status(200).json({ success: true, data: attendance });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyFacePhotos = async (req: Request, res: Response) => {
  try {
    const { checkInPhoto, checkOutPhoto } = req.body;

    if (!checkInPhoto || !checkOutPhoto) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Both checkInPhoto and checkOutPhoto are required for verification",
      });
    }

    const { verifyFacesWithDeepFace } = await import("../services/faceVerification.service");
    const result = await verifyFacesWithDeepFace(checkInPhoto, checkOutPhoto);

    return res.status(200).json({
      success: result.success,
      verified: result.verified,
      distance: result.distance,
      threshold: result.threshold,
      matchPercentage: result.matchPercentage,
      model: result.model,
      message: result.message,
      error: result.error,
    });
  } catch (err: any) {
    console.error("Error verifying face photos with DeepFace:", err);
    return res.status(500).json({
      success: false,
      verified: false,
      message: err.message || "DeepFace face verification failed",
    });
  }
};