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
exports.verifyFacePhotos = exports.getTodayAttendanceStatus = exports.handleCheckOut = exports.handleCheckIn = exports.deleteAttendance = exports.updateAttendance = exports.getWorkerAttendance = exports.getAllAttendance = exports.createAttendance = void 0;
const attendanceService = __importStar(require("../services/attendance.service"));
const attendance_validator_1 = require("../validators/attendance.validator");
const createAttendance = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const body = attendance_validator_1.attendanceSchema.parse(req.body);
        const attendance = await attendanceService.markAttendance(body.workerId, req.user.id, body.date, body.status, body.overtimeHours, body.remarks || undefined, {
            statusCode: body.statusCode,
            checkInTime: body.checkInTime,
            checkOutTime: body.checkOutTime,
            checkInPhoto: body.checkInPhoto,
            checkOutPhoto: body.checkOutPhoto,
            siteId: body.siteId,
            dailyPay: body.dailyPay,
        });
        return res.status(201).json({
            success: true,
            data: attendance,
        });
    }
    catch (err) {
        console.error("Error creating attendance:", err);
        return res.status(400).json({
            success: false,
            message: err?.errors?.[0]?.message || err.message || "Failed to mark attendance",
        });
    }
};
exports.createAttendance = createAttendance;
const getAllAttendance = async (req, res) => {
    try {
        const user = req.user;
        let data;
        if (user && user.role === "WORKER") {
            data = await attendanceService.getAttendanceByWorker(user.id);
        }
        else {
            data = await attendanceService.getAttendance();
        }
        return res.json({
            success: true,
            data,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch attendance records",
        });
    }
};
exports.getAllAttendance = getAllAttendance;
const getWorkerAttendance = async (req, res) => {
    try {
        const data = await attendanceService.getAttendanceByWorker(Number(req.params.workerId));
        return res.json({
            success: true,
            data,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch worker attendance",
        });
    }
};
exports.getWorkerAttendance = getWorkerAttendance;
const updateAttendance = async (req, res) => {
    try {
        const data = await attendanceService.updateAttendance(Number(req.params.id), req.body);
        return res.json({
            success: true,
            data,
        });
    }
    catch (err) {
        console.error("Error updating attendance:", err);
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to update attendance",
        });
    }
};
exports.updateAttendance = updateAttendance;
const deleteAttendance = async (req, res) => {
    try {
        await attendanceService.deleteAttendance(Number(req.params.id));
        return res.json({
            success: true,
            message: "Attendance deleted",
        });
    }
    catch (err) {
        return res.status(400).json({
            success: false,
            message: err.message || "Failed to delete attendance",
        });
    }
};
exports.deleteAttendance = deleteAttendance;
const handleCheckIn = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const attendance = await attendanceService.agentCheckIn(req.user.id);
        return res.status(200).json({ success: true, data: attendance });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message || "Check-in failed" });
    }
};
exports.handleCheckIn = handleCheckIn;
const handleCheckOut = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const attendance = await attendanceService.agentCheckOut(req.user.id);
        return res.status(200).json({ success: true, data: attendance });
    }
    catch (err) {
        return res.status(400).json({ success: false, message: err.message || "Check-out failed" });
    }
};
exports.handleCheckOut = handleCheckOut;
const getTodayAttendanceStatus = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const attendance = await attendanceService.getTodayAgentAttendance(req.user.id);
        return res.status(200).json({ success: true, data: attendance });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
exports.getTodayAttendanceStatus = getTodayAttendanceStatus;
const verifyFacePhotos = async (req, res) => {
    try {
        const { checkInPhoto, checkOutPhoto } = req.body;
        if (!checkInPhoto || !checkOutPhoto) {
            return res.status(400).json({
                success: false,
                verified: false,
                message: "Both checkInPhoto and checkOutPhoto are required for verification",
            });
        }
        const { verifyFacesWithDeepFace } = await Promise.resolve().then(() => __importStar(require("../services/faceVerification.service")));
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
    }
    catch (err) {
        console.error("Error verifying face photos with DeepFace:", err);
        return res.status(500).json({
            success: false,
            verified: false,
            message: err.message || "DeepFace face verification failed",
        });
    }
};
exports.verifyFacePhotos = verifyFacePhotos;
