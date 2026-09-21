import { Request, Response } from "express";
import * as incentiveService from "../services/incentive.service";

/**
 * GET /api/incentives/summary
 * Super Agent only: Summary KPI cards
 */
export const getSummary = async (req: Request, res: Response) => {
  try {
    const summary = await incentiveService.getSuperAgentIncentivesSummary();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch incentive summary",
    });
  }
};

/**
 * GET /api/incentives/agents
 * Super Agent only: Paginated list of agents with incentive metrics
 */
export const getAgentList = async (req: Request, res: Response) => {
  try {
    const { search, status, dateFilter, startDate, endDate, page, limit } = req.query;

    const result = await incentiveService.getAgentIncentivesList({
      search: search as string,
      status: status as string,
      dateFilter: dateFilter as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch agent incentives",
    });
  }
};

/**
 * GET /api/incentives/agents/:agentId
 * Super Agent or authenticated Agent viewing own records (IDOR protected)
 */
export const getAgentDetails = async (req: Request, res: Response) => {
  try {
    const targetAgentId = Number(req.params.agentId);
    if (isNaN(targetAgentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent ID",
      });
    }

    const authUser = (req as any).user;
    // IDOR protection: AGENT role can only access their own details
    if (authUser?.role === "AGENT" && authUser.id !== targetAgentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this agent's incentive data",
      });
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const details = await incentiveService.getAgentIncentiveDetails(targetAgentId, page, limit);

    return res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    return res.status(error.message === "Agent not found" ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to fetch agent incentive details",
    });
  }
};

/**
 * GET /api/incentives/my-summary
 * Authenticated Agent: Fetch own worker registration incentive metrics
 */
export const getMySummary = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    if (!authUser || authUser.role !== "AGENT") {
      return res.status(403).json({
        success: false,
        message: "Only field agents can access personal incentive metrics",
      });
    }

    const summary = await incentiveService.getMyAgentIncentiveSummary(authUser.id);
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch personal incentive summary",
    });
  }
};

/**
 * GET /api/incentives/export
 * Super Agent only: Stream professional multi-sheet Excel file (.xlsx)
 */
export const exportExcel = async (req: Request, res: Response) => {
  try {
    const excelBuffer = await incentiveService.generateAgentIncentivesExcelBuffer();
    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `Agent_Registration_Incentives_${dateStr}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(excelBuffer);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate Excel export",
    });
  }
};
