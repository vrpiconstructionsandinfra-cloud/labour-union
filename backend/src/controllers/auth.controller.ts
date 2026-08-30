import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { sendWorkerEmailVerificationOtp, sendWorkerWelcomeCredentialsEmail, sendVerificationCodeEmail, sendAgentCredentialsEmail } from "../services/mail.service";

const verificationOtps = new Map<string, { otp: string; expiresAt: number }>();

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      designation,
      employeeCode,
      salary,
      siteId,
      avatar,
      bankAccountNo,
      ifscCode,
      address,
      registrationAmount,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
      upiTransactionId
    } = req.body;

    const user =
      await authService.registerUser(
        name,
        email,
        password,
        role || "WORKER",
        phone,
        designation,
        employeeCode,
        salary ? Number(salary) : undefined,
        siteId ? Number(siteId) : undefined,
        avatar,
        {
          bankAccountNo,
          ifscCode,
          address,
          registrationAmount: registrationAmount ? Number(registrationAmount) : undefined,
          paymentMethod,
          razorpayPaymentId,
          razorpayOrderId,
          upiTransactionId
        }
      );

    if (user && user.email) {
      if (role === 'AGENT' || role === 'SUPER_AGENT' || role === 'CUSTOMER_SUPPORT') {
        sendAgentCredentialsEmail(
          user.email,
          user.name,
          user.employeeCode || employeeCode || `AGT-${user.id}`,
          password
        ).catch((err) => console.warn('Agent Welcome email error:', err.message));
      } else {
        sendWorkerWelcomeCredentialsEmail(
          user.email,
          user.name,
          user.employeeCode || employeeCode || `WRK-${user.id}`,
          password
        ).catch((err) => console.warn('Welcome email error:', err.message));
      }
    }

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email, password, portal } = req.body;

    const data =
      await authService.loginUser(
        email,
        password,
        portal
      );

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
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

/*
 * Forgot Password
 */
export const forgotPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    const data =
      await authService.forgotPassword(
        email
      );

    res.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Reset Password
 */
export const resetPassword = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      token,
      password,
    } = req.body;

    const data =
      await authService.resetPassword(
        token,
        password
      );

    res.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get Current User Profile (JWT Authenticated)
 */
export const getMe = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Request Mobile Email Approval Login
 */
export const requestMobileApproval = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const data = await authService.requestMobileApproval(email);
    res.json({
      success: true,
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
 * Check Mobile Approval Status (Desktop Polling)
 */
export const checkApprovalStatus = async (req: Request, res: Response) => {
  try {
    const authRequestId = String(req.params.authRequestId);
    const data = await authService.checkApprovalStatus(authRequestId);
    res.json({
      success: true,
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
 * Mobile Approves Login Token
 */
export const approveLoginToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const data = await authService.approveLoginToken(token);
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    verificationOtps.set(cleanEmail, { otp, expiresAt });

    await sendVerificationCodeEmail(cleanEmail, otp);

    res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}`
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send verification code'
    });
  }
};

export const verifyCode = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify code'
    });
  }
};