import { Router } from "express";

import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  requestMobileApproval,
  checkApprovalStatus,
  approveLoginToken,
  sendVerificationCode,
  verifyCode
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authenticate, getMe);

router.post("/register", register);

router.post("/login", login);

router.post("/send-verification-code", sendVerificationCode);

router.post("/verify-code", verifyCode);

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/reset-password",
  resetPassword
);

router.post(
  "/request-mobile-approval",
  requestMobileApproval
);

router.get(
  "/approval-status/:authRequestId",
  checkApprovalStatus
);

router.post(
  "/approve-login-token",
  approveLoginToken
);

export default router;