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
exports.createInsurance = createInsurance;
exports.getAllInsurance = getAllInsurance;
exports.getMyInsurance = getMyInsurance;
exports.getWorkerInsurance = getWorkerInsurance;
exports.updateInsurance = updateInsurance;
exports.deleteInsurance = deleteInsurance;
const insuranceService = __importStar(require("../services/insurance.service"));
const insurance_validator_1 = require("../validators/insurance.validator");
/*
 * Create Insurance
 */
async function createInsurance(req, res) {
    try {
        const body = insurance_validator_1.insuranceSchema.parse(req.body);
        const insurance = await insuranceService.createInsurance(body);
        res.status(201).json({
            success: true,
            message: "Insurance created successfully",
            data: insurance,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Get All Insurance
 */
async function getAllInsurance(req, res) {
    try {
        const data = await insuranceService.getAllInsurance(req.user);
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
}
/*
 * Worker - My Insurance
 */
async function getMyInsurance(req, res) {
    try {
        const data = await insuranceService.getMyInsurance(req.user.id);
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
}
/*
 * Super Agent - Worker Insurance
 */
async function getWorkerInsurance(req, res) {
    try {
        const data = await insuranceService.getInsurance(Number(req.params.workerId));
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
}
/*
 * Update Insurance
 */
async function updateInsurance(req, res) {
    try {
        const data = await insuranceService.updateInsurance(Number(req.params.id), req.body);
        res.json({
            success: true,
            message: "Insurance updated successfully",
            data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
/*
 * Delete Insurance
 */
async function deleteInsurance(req, res) {
    try {
        await insuranceService.deleteInsurance(Number(req.params.id));
        res.json({
            success: true,
            message: "Insurance deleted successfully",
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
}
