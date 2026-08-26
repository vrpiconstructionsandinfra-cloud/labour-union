import { Request, Response } from "express";
import prisma from "../config/prisma";

import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getWorkers,
  getAgents,
} from "../services/user.service";

/*
 * Get all users
 */
export async function findAll(
  req: Request,
  res: Response
) {
  try {
    const users = await getAllUsers();

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/*
 * Get user by ID
 */
export async function findOne(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
}

/*
 * Public worker verification profile endpoint (No JWT required)
 */
export async function getPublicWorker(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid worker ID" });
    }

    const worker = await prisma.user.findUnique({
      where: { id },
      include: {
        site: true,
        assignedAgent: true
      }
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker profile not found" });
    }

    res.json({
      success: true,
      data: {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone,
        employeeCode: worker.employeeCode || `WRK-${String(worker.id).padStart(3, '0')}`,
        designation: worker.designation || 'General Worker',
        role: worker.role,
        avatar: (worker as any).avatar || worker.profileImage,
        address: (worker as any).address || 'Labor Union Registered Member',
        siteName: worker.site?.siteName || 'Assigned Site',
        siteCode: worker.site?.siteCode || 'SITE-001',
        city: worker.site?.city || 'Mumbai',
        state: worker.site?.state || 'Maharashtra',
        status: worker.active ? 'ACTIVE' : 'INACTIVE',
        joinedAt: worker.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

/*
 * Update user
 */
export async function update(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    const user = await updateUser(
      id,
      req.body,
      (req as any).user
    );

    res.json({
      success: true,
      data: user,
    });

  } catch (error: any) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}

/*
 * Delete user
 */
export async function remove(
  req: Request,
  res: Response
) {
  try {
    const id = Number(req.params.id);

    await deleteUser(id, (req as any).user);

    res.json({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error: any) {

    res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}

/*
 * Get workers filtered by logged-in user role
 */
export async function workers(
  req: Request,
  res: Response
) {
  try {
    const reqUser = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const users = await getWorkers(reqUser);

    res.json({
      success: true,
      data: users,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
}

/*
 * Get all agents
 */
export async function agents(
  req: Request,
  res: Response
) {
  try {

    const users = await getAgents();

    res.json({
      success: true,
      data: users,
    });

  } catch (error: any) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
}