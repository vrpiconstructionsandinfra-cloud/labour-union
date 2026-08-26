import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";

import {
  generatePayment,
  getPayments,
  getPaymentById,
  markAsPaid,
  getWorkerPayments,
} from "../controllers/payment.controller";

const router = Router();

router.use(authenticate);

// Super Agent only
router.post(
  "/",
  authorize("SUPER_AGENT"),
  generatePayment
);

router.get(
  "/",
  authorize("SUPER_AGENT"),
  getPayments
);

router.get(
  "/:id",
  authorize("SUPER_AGENT"),
  getPaymentById
);

router.patch(
  "/:id/pay",
  authorize("SUPER_AGENT"),
  markAsPaid
);

// Worker Payment History
router.get(
  "/worker/:workerId",
  authorize("SUPER_AGENT", "AGENT", "WORKER"),
  getWorkerPayments
);

export default router;