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
exports.rejectDisbursement = exports.approveDisbursement = exports.getDisbursementRequests = exports.createDisbursementRequest = exports.disburseWeekly = exports.debitWallet = exports.creditWallet = exports.getWalletDashboard = exports.getWorkerWallet = exports.getWalletHistory = exports.getWallets = void 0;
const walletService = __importStar(require("../services/wallet.service"));
/*
 * Get Wallets (Worker gets own wallet, Super Agent/Agent gets all wallets)
 */
const getWallets = async (req, res) => {
    try {
        if (req.user?.role === "WORKER") {
            const wallet = await walletService.getWallet(req.user.id);
            return res.status(200).json({
                success: true,
                data: wallet ? [wallet] : [],
            });
        }
        const wallets = await walletService.getAllWallets();
        res.status(200).json({
            success: true,
            data: wallets,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getWallets = getWallets;
/*
 * Get Logged-in Worker Wallet History
 */
const getWalletHistory = async (req, res) => {
    try {
        const history = await walletService.getWalletHistory(req.user.id);
        res.status(200).json({
            success: true,
            data: history,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getWalletHistory = getWalletHistory;
/*
 * Get Any Worker Wallet (Super Agent)
 */
const getWorkerWallet = async (req, res) => {
    try {
        const workerId = Number(req.params.workerId);
        const wallet = await walletService.getWorkerWallet(workerId);
        res.status(200).json({
            success: true,
            data: wallet,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getWorkerWallet = getWorkerWallet;
/*
 * Wallet Dashboard
 */
const getWalletDashboard = async (req, res) => {
    try {
        const dashboard = await walletService.getWalletDashboard();
        res.status(200).json({
            success: true,
            data: dashboard,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getWalletDashboard = getWalletDashboard;
/*
 * Credit Worker Wallet
 */
const creditWallet = async (req, res) => {
    try {
        const { workerId, amount, description, } = req.body;
        const wallet = await walletService.creditWallet(Number(workerId), Number(amount), description);
        res.status(200).json({
            success: true,
            message: "Wallet credited successfully",
            data: wallet,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.creditWallet = creditWallet;
/*
 * Debit Worker Wallet
 */
const debitWallet = async (req, res) => {
    try {
        const { workerId, amount, description, } = req.body;
        const wallet = await walletService.debitWallet(Number(workerId), Number(amount), description);
        res.status(200).json({
            success: true,
            message: "Wallet debited successfully",
            data: wallet,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.debitWallet = debitWallet;
/*
 * Disburse Weekly Attendance Allowance
 */
const disburseWeekly = async (req, res) => {
    try {
        const { poolAmount } = req.body;
        const result = await walletService.disburseWeeklyAllowance(poolAmount ? Number(poolAmount) : undefined);
        res.status(200).json({
            success: true,
            message: "Weekly attendance allowance disbursed successfully to eligible workers and agents",
            data: result,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.disburseWeekly = disburseWeekly;
/*
 * Agent creates a Disbursement Request
 */
const createDisbursementRequest = async (req, res) => {
    try {
        const { workerId, amount, description } = req.body;
        const agentId = req.user.id;
        const request = await walletService.requestDisbursement(agentId, Number(workerId), Number(amount), description);
        res.status(201).json({
            success: true,
            message: "Disbursement request submitted for Super Agent approval",
            data: request,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.createDisbursementRequest = createDisbursementRequest;
/*
 * Get Disbursement Requests
 */
const getDisbursementRequests = async (req, res) => {
    try {
        const requests = await walletService.getDisbursementRequests(req.user);
        res.status(200).json({
            success: true,
            data: requests,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getDisbursementRequests = getDisbursementRequests;
/*
 * Super Agent Approves Disbursement Request
 */
const approveDisbursement = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const approved = await walletService.approveDisbursementRequest(id, req.user);
        res.status(200).json({
            success: true,
            message: "Disbursement request approved successfully",
            data: approved,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.approveDisbursement = approveDisbursement;
/*
 * Super Agent Rejects Disbursement Request
 */
const rejectDisbursement = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const rejected = await walletService.rejectDisbursementRequest(id, req.user);
        res.status(200).json({
            success: true,
            message: "Disbursement request rejected",
            data: rejected,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.rejectDisbursement = rejectDisbursement;
