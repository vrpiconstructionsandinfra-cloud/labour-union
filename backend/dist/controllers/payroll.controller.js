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
exports.generatePayroll = generatePayroll;
exports.getPayrolls = getPayrolls;
exports.getPayrollById = getPayrollById;
const payrollService = __importStar(require("../services/payroll.service"));
/*
 * Generate Payroll (Scoped to logged-in user role)
 */
async function generatePayroll(req, res) {
    try {
        const { workerId, weekStart, weekEnd, } = req.body;
        const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const payrolls = await payrollService.generateBulkPayroll(reqUser, workerId ? Number(workerId) : null, weekStart ? new Date(weekStart) : undefined, weekEnd ? new Date(weekEnd) : undefined);
        res.status(201).json({
            success: true,
            message: "Payroll generated successfully",
            data: payrolls,
        });
    }
    catch (error) {
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
async function getPayrolls(req, res) {
    try {
        const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
        const payrolls = await payrollService.getPayrolls(reqUser);
        res.json({
            success: true,
            data: payrolls,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get Payroll By ID
 */
async function getPayrollById(req, res) {
    try {
        const payroll = await payrollService.getPayrollById(Number(req.params.id));
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
