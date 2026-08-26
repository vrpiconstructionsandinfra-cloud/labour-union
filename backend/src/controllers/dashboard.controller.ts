import { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service";

export const getDashboardStats = async (
  req: Request,
  res: Response
) => {
  try {
    const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const { startDate, endDate } = req.query;

    const statsData = await dashboardService.getDashboardStats(
      reqUser,
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );

    res.json({
      success: true,
      data: {
        cards: statsData.cards,
        stats: statsData.stats,
        attendance: statsData.attendance,
        payroll: statsData.payroll,
        leave: statsData.leave,
        recentActivities: statsData.recentActivities,
        agents: statsData.agents
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
};