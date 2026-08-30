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
exports.getAllLeaves = exports.rejectLeave = exports.approveLeave = exports.getPendingLeaves = exports.getMyLeaves = exports.applyLeave = void 0;
const leaveService = __importStar(require("../services/leave.service"));
const leave_validator_1 = require("../validators/leave.validator");
/*
 * Apply Leave
 */
const applyLeave = async (req, res) => {
    try {
        const body = leave_validator_1.leaveSchema.parse(req.body);
        const targetWorkerId = req.body.workerId ? Number(req.body.workerId) : req.user.id;
        const leave = await leaveService.applyLeave(targetWorkerId, new Date(body.fromDate), new Date(body.toDate), body.reason);
        res.status(201).json({
            success: true,
            message: "Leave applied successfully",
            data: leave,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.applyLeave = applyLeave;
/*
 * Get My Leaves
 */
const getMyLeaves = async (req, res) => {
    try {
        const data = await leaveService.getMyLeaves(req.user.id);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getMyLeaves = getMyLeaves;
/*
 * Get All Pending Leaves
 */
const getPendingLeaves = async (req, res) => {
    try {
        const data = await leaveService.getPendingLeaves(req.user.id);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getPendingLeaves = getPendingLeaves;
/*
 * Approve Leave
 */
const approveLeave = async (req, res) => {
    try {
        const reqUserRole = req.user?.role;
        const data = await leaveService.approveLeave(Number(req.params.id), req.user.id, reqUserRole);
        res.json({
            success: true,
            message: "Leave approved successfully",
            data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.approveLeave = approveLeave;
/*
 * Reject Leave
 */
const rejectLeave = async (req, res) => {
    try {
        const reqUserRole = req.user?.role;
        const data = await leaveService.rejectLeave(Number(req.params.id), req.user.id, reqUserRole);
        res.json({
            success: true,
            message: "Leave rejected successfully",
            data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.rejectLeave = rejectLeave;
/*
 * Get All Leaves (Scoped to requesting user role)
 */
const getAllLeaves = async (req, res) => {
    try {
        const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const data = await leaveService.getAllLeaves(reqUser);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getAllLeaves = getAllLeaves;
