import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { UserRole } from "@prisma/client";

import {
  getWallets,
  getWalletHistory,
  getWorkerWallet,
  getWalletDashboard,
  creditWallet,
  debitWallet,
  disburseWeekly,
  createDisbursementRequest,
  getDisbursementRequests,
  approveDisbursement,
  rejectDisbursement,
} from "../controllers/wallet.controller";

const router = Router();

router.use(authenticate);

// Get wallets (Worker gets own, Super Agent/Agent gets all)
router.get(
  "/",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  getWallets
);

// Wallet dashboard aggregates
router.get(
  "/dashboard",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  getWalletDashboard
);

// Get disbursement requests
router.get(
  "/disbursements",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  getDisbursementRequests
);

// Agent requests disbursement for worker
router.post(
  "/request-disbursement",
  authorize(UserRole.AGENT),
  createDisbursementRequest
);

// Super Agent approves disbursement
router.post(
  "/disbursements/:id/approve",
  authorize(UserRole.SUPER_AGENT),
  approveDisbursement
);

// Super Agent rejects disbursement
router.post(
  "/disbursements/:id/reject",
  authorize(UserRole.SUPER_AGENT),
  rejectDisbursement
);

// Disburse weekly attendance allowance
router.post(
  "/disburse-weekly",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  disburseWeekly
);

// Get logged-in user wallet history
router.get(
  "/history",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT, UserRole.WORKER),
  getWalletHistory
);

// Get any worker wallet
router.get(
  "/:workerId",
  authorize(UserRole.SUPER_AGENT, UserRole.AGENT),
  getWorkerWallet
);

// Credit worker wallet (Super Agent directly credits agent or worker)
router.post(
  "/credit",
  authorize(UserRole.SUPER_AGENT),
  creditWallet
);

// Debit worker wallet (Super Agent)
router.post(
  "/debit",
  authorize(UserRole.SUPER_AGENT),
  debitWallet
);

export default router;