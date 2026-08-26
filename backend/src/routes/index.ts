import { Router } from "express";

import authRoutes from "./auth.routes";
import siteRoutes from "./site.routes";
import attendanceRoutes from "./attendance.routes";
import leaveRoutes from "./leave.routes";
import paymentRoutes from "./payment.routes";
import walletRoutes from "./wallet.routes";
import dashboardRoutes from "./dashboard.routes";
import insuranceRoutes from "./insurance.routes";
import supportRoutes from "./support.routes";
import userRoutes from "./user.routes";
import agentRoutes from "./agent.routes";
import siteAssignmentRoutes from "./siteAssignment.routes";
import payrollRoutes from "./payroll.routes";
import notificationRoutes from "./notification.routes";
import reportRoutes from "./report.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/sites", siteRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/wallet", walletRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/payments", paymentRoutes);
router.use("/insurance", insuranceRoutes);
router.use("/support", supportRoutes);
router.use("/users", userRoutes);
router.use("/agents", agentRoutes);
router.use("/site-assignment", siteAssignmentRoutes);
router.use("/payroll", payrollRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);

export default router;