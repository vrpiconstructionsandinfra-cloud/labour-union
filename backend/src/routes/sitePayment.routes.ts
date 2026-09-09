import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  createSitePaymentHandler,
  getSitePaymentsHandler,
  exportSitePaymentsExcelHandler
} from "../controllers/sitePayment.controller";

const router = Router();

router.use(authenticate);

router.post("/", createSitePaymentHandler);
router.get("/", getSitePaymentsHandler);
router.get("/export-excel", exportSitePaymentsExcelHandler);

export default router;
