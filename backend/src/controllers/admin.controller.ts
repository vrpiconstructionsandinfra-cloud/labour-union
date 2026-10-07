import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";

/*
 * GET /api/admins
 * List all Admins with stats
 */
export async function getAdmins(req: Request, res: Response) {
  try {
    const admins = await adminService.getAllAdmins();
    res.json({
      success: true,
      data: admins,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch administrators",
    });
  }
}

/*
 * GET /api/admins/:id
 * Get single Admin detail with agents, workers, and sites
 */
export async function getAdmin(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid Admin ID" });
    }

    // Role check: If caller is ADMIN, they can only view their own record unless SUPER_AGENT
    if (req.user?.role === UserRole.ADMIN && req.user.id !== id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const admin = await adminService.getAdminById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin details",
    });
  }
}

/*
 * POST /api/admins
 * Create a new Admin (Super Admin action)
 */
export async function createAdmin(req: Request, res: Response) {
  try {
    const { name, email, password, phone, employeeCode, designation, address, salary, profileImage, agentIds, registrationAmount, paymentMethod, razorpayPaymentId, razorpayOrderId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const newAdmin = await adminService.createAdmin({
      name,
      email,
      password,
      phone,
      employeeCode,
      designation,
      address,
      salary,
      profileImage,
      agentIds: Array.isArray(agentIds) ? agentIds.map(Number) : undefined,
      registrationAmount: registrationAmount !== undefined ? Number(registrationAmount) : undefined,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
    });

    res.status(201).json({
      success: true,
      data: newAdmin,
      message: "Administrator created successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create administrator",
    });
  }
}

/*
 * PUT /api/admins/:id
 * Update an existing Admin
 */
export async function updateAdmin(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid Admin ID" });
    }

    if (req.user?.role === UserRole.ADMIN && req.user.id !== id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updated = await adminService.updateAdmin(id, req.body, req.user);

    res.json({
      success: true,
      data: updated,
      message: "Administrator updated successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update administrator",
    });
  }
}

/*
 * DELETE /api/admins/:id
 * Delete an Admin (Super Admin action)
 */
export async function deleteAdmin(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid Admin ID" });
    }

    const result = await adminService.deleteAdmin(id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete administrator",
    });
  }
}

/*
 * POST /api/admins/:id/assign-agents
 * Assign one or more agents to an Admin
 */
export async function assignAgents(req: Request, res: Response) {
  try {
    const adminId = Number(req.params.id);
    const { agentIds } = req.body;

    if (!Array.isArray(agentIds) || agentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "agentIds array is required",
      });
    }

    const result = await adminService.assignAgentsToAdmin(
      adminId,
      agentIds.map(Number)
    );

    res.json({
      success: true,
      data: result,
      message: "Agents successfully assigned to Administrator",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to assign agents",
    });
  }
}

/*
 * DELETE /api/admins/:id/agents/:agentId
 * Remove agent from Admin
 */
export async function removeAgent(req: Request, res: Response) {
  try {
    const adminId = Number(req.params.id);
    const agentId = Number(req.params.agentId);

    const result = await adminService.removeAgentFromAdmin(adminId, agentId);

    res.json({
      success: true,
      message: "Agent removed from Administrator",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to remove agent",
    });
  }
}

/*
 * GET /api/admins/portal/dashboard
 * Dashboard stats for Admin Portal (for logged in ADMIN, or SUPER_AGENT inspecting)
 */
export async function getAdminPortalDashboard(req: Request, res: Response) {
  try {
    let effectiveAdminId: number;

    if (req.user?.role === UserRole.ADMIN) {
      effectiveAdminId = req.user.id;
    } else if (req.user?.role === UserRole.SUPER_AGENT && req.query.adminId) {
      effectiveAdminId = Number(req.query.adminId);
    } else {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required for super admin inspection",
      });
    }

    const details = await adminService.getAdminById(effectiveAdminId);
    if (!details) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin portal dashboard",
    });
  }
}

/*
 * POST /api/admins/portal/create-agent
 * Admin creates an agent under their supervision
 */
export async function createAgentUnderAdmin(req: Request, res: Response) {
  try {
    const effectiveAdminId =
      req.user?.role === UserRole.SUPER_AGENT && req.body.adminId
        ? Number(req.body.adminId)
        : req.user!.id;

    const {
      name,
      email,
      password,
      phone,
      designation,
      siteId,
      employeeCode,
      salary,
      profileImage,
      address,
      registrationAmount,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Agent name is required" });
    }

    const newAgent = await adminService.adminCreateAgent(effectiveAdminId, {
      name,
      email,
      password,
      phone,
      designation,
      siteId,
      employeeCode,
      salary,
      profileImage,
      address,
      registrationAmount,
      paymentMethod,
      razorpayPaymentId,
      razorpayOrderId,
    });

    res.status(201).json({
      success: true,
      data: newAgent,
      message: "Field agent created and assigned to your supervision successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create agent",
    });
  }
}

/*
 * DELETE /api/admins/portal/agents/:agentId
 * Admin deletes an agent under their supervision
 */
export async function deleteAgentUnderAdmin(req: Request, res: Response) {
  try {
    const callerUser = { id: req.user!.id, role: req.user!.role };
    const agentId = Number(req.params.agentId);

    if (!agentId || isNaN(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    await adminService.adminDeleteAgent(callerUser, agentId);

    res.json({
      success: true,
      message: "Agent deleted successfully",
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to delete agent",
    });
  }
}

/*
 * GET /api/admins/portal/agent/:agentId/workers
 * Monitor workers and attendance under a particular agent
 */
export async function getAgentWorkersUnderAdmin(req: Request, res: Response) {
  try {
    const agentId = Number(req.params.agentId);
    if (!agentId || isNaN(agentId)) {
      return res.status(400).json({ success: false, message: "Invalid agent ID" });
    }

    // Verify agent belongs to this Admin if caller is ADMIN
    if (req.user?.role === UserRole.ADMIN) {
      const agent = await prisma.user.findUnique({
        where: { id: agentId },
        select: { assignedAdminId: true },
      });
      if (!agent || agent.assignedAdminId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied: This agent is not under your supervision",
        });
      }
    }

    const workers = await prisma.user.findMany({
      where: { assignedAgentId: agentId, role: UserRole.WORKER },
      include: {
        site: {
          select: { id: true, siteName: true, siteCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendances = await prisma.attendance.findMany({
      where: {
        workerId: { in: workers.map((w) => w.id) },
        date: { gte: today, lt: tomorrow },
      },
    });

    const attMap = new Map();
    attendances.forEach((a) => attMap.set(a.workerId, a));

    const workerList = workers.map((w) => {
      const att = attMap.get(w.id);
      return {
        id: w.id,
        name: w.name,
        employeeCode: w.employeeCode,
        phone: w.phone,
        email: w.email,
        designation: w.designation,
        salary: w.salary,
        active: w.active,
        status: w.status,
        siteName: w.site?.siteName || "Unassigned",
        siteCode: w.site?.siteCode || null,
        attendanceToday: att ? att.status : "NOT_MARKED",
        checkInTime: att?.checkInTime || null,
        checkOutTime: att?.checkOutTime || null,
      };
    });

    res.json({
      success: true,
      data: workerList,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch workers",
    });
  }
}
