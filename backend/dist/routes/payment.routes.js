"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const payment_controller_1 = require("../controllers/payment.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Razorpay Order Creation
router.post("/razorpay-order", payment_controller_1.createRazorpayOrder);
// Super Agent only
router.post("/", (0, role_middleware_1.authorize)("SUPER_AGENT"), payment_controller_1.generatePayment);
router.get("/", (0, role_middleware_1.authorize)("SUPER_AGENT"), payment_controller_1.getPayments);
router.get("/:id", (0, role_middleware_1.authorize)("SUPER_AGENT"), payment_controller_1.getPaymentById);
router.patch("/:id/pay", (0, role_middleware_1.authorize)("SUPER_AGENT"), payment_controller_1.markAsPaid);
// Worker Payment History
router.get("/worker/:workerId", (0, role_middleware_1.authorize)("SUPER_AGENT", "AGENT", "WORKER"), payment_controller_1.getWorkerPayments);
exports.default = router;
