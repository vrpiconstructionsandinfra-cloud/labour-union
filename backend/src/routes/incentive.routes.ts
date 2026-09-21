import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import {
  getSummary,
  getAgentList,
  getAgentDetails,
  getMySummary,
  exportExcel,
} from "../controllers/incentive.controller";

const router = Router();

// All incentive endpoints require authentication
router.use(authenticate);

// Super Agent Dashboard Summary & Overview
router.get("/summary", authorize("SUPER_AGENT"), getSummary);

// Super Agent Paginated Agent Incentives Directory
router.get("/agents", authorize("SUPER_AGENT"), getAgentList);

// Super Agent Multi-sheet Excel Export
router.get("/export", authorize("SUPER_AGENT"), exportExcel);

// Field Agent's own live summary (for Agent Dashboard widget)
router.get("/my-summary", authorize("AGENT"), getMySummary);

// Single Agent detail profile and registration history (Super Agent or self)
router.get("/agents/:agentId", authorize("SUPER_AGENT", "AGENT"), getAgentDetails);

export default router;
