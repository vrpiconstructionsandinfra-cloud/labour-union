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
exports.verifyCode = exports.sendVerificationCode = exports.approveLoginToken = exports.checkApprovalStatus = exports.requestMobileApproval = exports.getMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/auth.service"));
const mail_service_1 = require("../services/mail.service");
const verificationOtps = new Map();
const register = async (req, res) => {
    try {
        const { name, email, password, role, phone, designation, employeeCode, salary, siteId, avatar, bankAccountNo, ifscCode, address, registrationAmount, paymentMethod, razorpayPaymentId, razorpayOrderId, upiTransactionId } = req.body;
        const user = await authService.registerUser(name, email, password, role || "WORKER", phone, designation, employeeCode, salary ? Number(salary) : undefined, siteId ? Number(siteId) : undefined, avatar, {
            bankAccountNo,
            ifscCode,
            address,
            registrationAmount: registrationAmount ? Number(registrationAmount) : undefined,
            paymentMethod,
            razorpayPaymentId,
            razorpayOrderId,
            upiTransactionId
        });
        if (user && user.email) {
            if (role === 'AGENT' || role === 'SUPER_AGENT' || role === 'CUSTOMER_SUPPORT') {
                (0, mail_service_1.sendAgentCredentialsEmail)(user.email, user.name, user.employeeCode || employeeCode || `AGT-${user.id}`, password).catch((err) => console.warn('Agent Welcome email error:', err.message));
            }
            else {
                (0, mail_service_1.sendWorkerWelcomeCredentialsEmail)(user.email, user.name, user.employeeCode || employeeCode || `WRK-${user.id}`, password).catch((err) => console.warn('Welcome email error:', err.message));
            }
        }
        res.status(201).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password, portal } = req.body;
        const data = await authService.loginUser(email, password, portal);
        res.json({
            success: true,
            data,
        });
    }
    catch (error) {
        let msg = error.message || "Invalid credentials";
        if (msg.includes("Connection terminated") || msg.includes("closed") || msg.includes("ECONNRESET")) {
            msg = "Database connection temporarily reset. Please click Sign In again.";
        }
        res.status(401).json({
            success: false,
            message: msg,
        });
    }
};
exports.login = login;
/*
 * Forgot Password
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const data = await authService.forgotPassword(email);
        res.json({
            success: true,
            ...data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.forgotPassword = forgotPassword;
/*
 * Reset Password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, password, } = req.body;
        const data = await authService.resetPassword(token, password);
        res.json({
            success: true,
            ...data,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
exports.resetPassword = resetPassword;
/*
 * Get Current User Profile (JWT Authenticated)
 */
const getMe = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.id);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: error.message,
        });
    }
};
exports.getMe = getMe;
/*
 * Request Mobile Email Approval Login
 */
const requestMobileApproval = async (req, res) => {
    try {
        const { email } = req.body;
        const data = await authService.requestMobileApproval(email);
        res.json({
            success: true,
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
exports.requestMobileApproval = requestMobileApproval;
/*
 * Check Mobile Approval Status (Desktop Polling)
 */
const checkApprovalStatus = async (req, res) => {
    try {
        const authRequestId = String(req.params.authRequestId);
        const data = await authService.checkApprovalStatus(authRequestId);
        res.json({
            success: true,
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
exports.checkApprovalStatus = checkApprovalStatus;
/*
 * Mobile Approves Login Token
 */
const approveLoginToken = async (req, res) => {
    try {
        const { token } = req.body;
        const data = await authService.approveLoginToken(token);
        res.json({
            success: true,
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
exports.approveLoginToken = approveLoginToken;
const sendVerificationCode = async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }
        const cleanEmail = email.trim().toLowerCase();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        verificationOtps.set(cleanEmail, { otp, expiresAt });
        await (0, mail_service_1.sendVerificationCodeEmail)(cleanEmail, otp);
        res.json({
            success: true,
            message: `Verification code sent to ${cleanEmail}`
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to send verification code'
        });
    }
};
exports.sendVerificationCode = sendVerificationCode;
const verifyCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ success: false, message: 'Email and verification code are required' });
        }
        const cleanEmail = email.trim().toLowerCase();
        const cached = verificationOtps.get(cleanEmail);
        if (!cached) {
            return res.status(400).json({ success: false, message: 'No verification code found for this email. Please request a new code.' });
        }
        if (Date.now() > cached.expiresAt) {
            verificationOtps.delete(cleanEmail);
            return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
        }
        if (cached.otp !== code.trim()) {
            return res.status(400).json({ success: false, message: 'Invalid verification code. Please check your email and try again.' });
        }
        verificationOtps.delete(cleanEmail);
        res.json({
            success: true,
            verified: true,
            message: 'Email address verified successfully!'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to verify code'
        });
    }
};
exports.verifyCode = verifyCode;
