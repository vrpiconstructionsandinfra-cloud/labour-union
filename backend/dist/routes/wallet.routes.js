"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const client_1 = require("@prisma/client");
const wallet_controller_1 = require("../controllers/wallet.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get wallets (Worker gets own, Super Agent/Agent gets all)
router.get("/", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), wallet_controller_1.getWallets);
// Wallet dashboard aggregates
router.get("/dashboard", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), wallet_controller_1.getWalletDashboard);
// Get disbursement requests
router.get("/disbursements", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), wallet_controller_1.getDisbursementRequests);
// Agent requests disbursement for worker
router.post("/request-disbursement", (0, role_middleware_1.authorize)(client_1.UserRole.AGENT), wallet_controller_1.createDisbursementRequest);
// Super Agent approves disbursement
router.post("/disbursements/:id/approve", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), wallet_controller_1.approveDisbursement);
// Super Agent rejects disbursement
router.post("/disbursements/:id/reject", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), wallet_controller_1.rejectDisbursement);
// Disburse weekly attendance allowance
router.post("/disburse-weekly", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), wallet_controller_1.disburseWeekly);
// Get logged-in user wallet history
router.get("/history", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT, client_1.UserRole.WORKER), wallet_controller_1.getWalletHistory);
// Get any worker wallet
router.get("/:workerId", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT, client_1.UserRole.AGENT), wallet_controller_1.getWorkerWallet);
// Credit worker wallet (Super Agent directly credits agent or worker)
router.post("/credit", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), wallet_controller_1.creditWallet);
// Debit worker wallet (Super Agent)
router.post("/debit", (0, role_middleware_1.authorize)(client_1.UserRole.SUPER_AGENT), wallet_controller_1.debitWallet);
exports.default = router;
