import prisma from "../config/prisma";
import { UserRole } from "@prisma/client";
import { hashPassword } from "../utils/hash";
import { deleteUser } from "./user.service";
import { memoryCache } from "../utils/cache";
import { sendAdminCredentialsEmail } from "./mail.service";

export function invalidateAdminCache(): void {
  memoryCache.delPrefix("admins_");
  memoryCache.delPrefix("users_");
  memoryCache.delPrefix("dashboard_");
}

/*
 * Get all Admins with their agent and worker counts
 */
export async function getAllAdmins() {
  const cacheKey = "admins_all";
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const admins = await prisma.user.findMany({
    where: { role: UserRole.ADMIN },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      employeeCode: true,
      designation: true,
      address: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
      agents: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          email: true,
          phone: true,
          active: true,
          siteId: true,
          site: {
            select: {
              id: true,
              siteName: true,
              siteCode: true,
              city: true,
              state: true,
            },
          },
          workers: {
            select: {
              id: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = admins.map((admin) => {
    const totalAgents = admin.agents.length;
    let totalWorkers = 0;
    const agentSummaries = admin.agents.map((agent) => {
      const workerCount = agent.workers.length;
      totalWorkers += workerCount;
      return {
        id: agent.id,
        name: agent.name,
        employeeCode: agent.employeeCode,
        email: agent.email,
        phone: agent.phone,
        active: agent.active,
        siteName: agent.site?.siteName || "Unassigned",
        siteCode: agent.site?.siteCode || null,
        location: agent.site ? `${agent.site.city}, ${agent.site.state}` : null,
        workersCount: workerCount,
      };
    });

    const distinctSiteIds = new Set(
      admin.agents.map((a) => a.siteId).filter(Boolean)
    );

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      status: admin.status,
      active: admin.active,
      employeeCode: admin.employeeCode || `ADM-${String(admin.id).padStart(3, "0")}`,
      designation: admin.designation || "Regional Administrator",
      address: admin.address || "Local Jurisdiction",
      profileImage: admin.profileImage,
      createdAt: admin.createdAt,
      totalAgents,
      totalWorkers,
      totalSites: distinctSiteIds.size,
      agents: agentSummaries,
    };
  });

  memoryCache.set(cacheKey, result, 20);
  return result;
}

/*
 * Get single Admin detail by ID with full agents, workers, and sites hierarchy
 */
export async function getAdminById(adminId: number) {
  const admin = await prisma.user.findFirst({
    where: { id: adminId, role: UserRole.ADMIN },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      employeeCode: true,
      designation: true,
      address: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
      agents: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          email: true,
          phone: true,
          active: true,
          designation: true,
          salary: true,
          profileImage: true,
          siteId: true,
          site: {
            select: {
              id: true,
              siteName: true,
              siteCode: true,
              address: true,
              city: true,
              state: true,
            },
          },
          workers: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              email: true,
              phone: true,
              designation: true,
              salary: true,
              active: true,
              status: true,
              profileImage: true,
              site: {
                select: {
                  id: true,
                  siteName: true,
                  siteCode: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!admin) {
    return null;
  }

  // Get today's attendance for all workers under these agents
  const allWorkerIds = admin.agents.flatMap((ag) => ag.workers.map((w) => w.id));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendances = await prisma.attendance.findMany({
    where: {
      workerId: { in: allWorkerIds },
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      workerId: true,
      status: true,
      checkInTime: true,
      checkOutTime: true,
    },
  });

  const attendanceMap = new Map<number, any>();
  todayAttendances.forEach((att) => {
    attendanceMap.set(att.workerId, att);
  });

  let totalWorkers = 0;
  let presentWorkersToday = 0;

  const agentsWithDetails = admin.agents.map((agent) => {
    const workersWithAttendance = agent.workers.map((w) => {
      const att = attendanceMap.get(w.id);
      const isPresent = att && att.status === "PRESENT";
      if (isPresent) {
        presentWorkersToday++;
      }
      return {
        id: w.id,
        name: w.name,
        employeeCode: w.employeeCode || `WRK-${String(w.id).padStart(3, "0")}`,
        email: w.email,
        phone: w.phone,
        designation: w.designation || "General Worker",
        salary: w.salary,
        active: w.active,
        status: w.status,
        profileImage: w.profileImage,
        siteName: w.site?.siteName || agent.site?.siteName || "Not assigned",
        siteCode: w.site?.siteCode || agent.site?.siteCode || null,
        todayAttendance: att ? att.status : "NOT_MARKED",
        checkInTime: att?.checkInTime || null,
        checkOutTime: att?.checkOutTime || null,
      };
    });

    totalWorkers += workersWithAttendance.length;

    return {
      id: agent.id,
      name: agent.name,
      employeeCode: agent.employeeCode || `AGT-${String(agent.id).padStart(3, "0")}`,
      email: agent.email,
      phone: agent.phone,
      active: agent.active,
      designation: agent.designation || "Field Supervisor",
      salary: agent.salary,
      profileImage: agent.profileImage,
      siteId: agent.siteId,
      siteName: agent.site?.siteName || "Unassigned Site",
      siteCode: agent.site?.siteCode || null,
      siteLocation: agent.site ? `${agent.site.city}, ${agent.site.state}` : null,
      siteAddress: agent.site?.address || null,
      workersCount: workersWithAttendance.length,
      workers: workersWithAttendance,
    };
  });

  // Fetch sites created by this admin or related to their local area
  const sites = await prisma.site.findMany({
    where: {
      OR: [
        { createdById: admin.id },
        { id: { in: admin.agents.map((a) => a.siteId).filter((id): id is number => id !== null) } },
      ],
    },
    select: {
      id: true,
      siteCode: true,
      siteName: true,
      companyName: true,
      address: true,
      city: true,
      state: true,
      pincode: true,
      status: true,
      active: true,
      createdAt: true,
    },
  });

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    active: admin.active,
    employeeCode: admin.employeeCode || `ADM-${String(admin.id).padStart(3, "0")}`,
    designation: admin.designation || "Regional Administrator",
    address: admin.address || "Local Area Office",
    profileImage: admin.profileImage,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    totalAgents: agentsWithDetails.length,
    totalWorkers,
    presentWorkersToday,
    attendanceRate: totalWorkers > 0 ? Math.round((presentWorkersToday / totalWorkers) * 100) : 0,
    agents: agentsWithDetails,
    sites,
  };
}

/*
 * Create Admin (Super Admin action)
 */
export async function createAdmin(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  employeeCode?: string;
  designation?: string;
  address?: string;
  salary?: number;
  profileImage?: string;
  agentIds?: number[];
  registrationAmount?: number;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}) {
  const cleanEmail = data.email?.trim()?.toLowerCase();
  if (cleanEmail) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new Error("Email is already registered");
    }
  }

  let code = data.employeeCode?.trim();
  if (!code) {
    const allAdminsWithCode = await prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        employeeCode: { startsWith: "ADM-" },
      },
      select: { employeeCode: true },
    });
    let maxNum = 0;
    for (const a of allAdminsWithCode) {
      if (a.employeeCode) {
        const match = a.employeeCode.match(/ADM-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    code = `ADM-${String(maxNum + 1).padStart(3, "0")}`;
  }

  const existingCode = await prisma.user.findFirst({ where: { employeeCode: code } });
  if (existingCode) {
    code = `ADM-${Date.now().toString().slice(-4)}`;
  }

  const hashedPassword = await hashPassword(data.password || "Admin@123");

  const newAdmin = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        name: data.name,
        email: cleanEmail,
        password: hashedPassword,
        phone: data.phone,
        role: UserRole.ADMIN,
        employeeCode: code,
        designation: data.designation || "Regional Administrator",
        address: data.address || "Local Area",
        salary: data.salary ? Number(data.salary) : 65000,
        profileImage: data.profileImage,
        active: true,
        mustChangePassword: true,
        registrationAmount: data.registrationAmount !== undefined ? Number(data.registrationAmount) : undefined,
        paymentMethod: data.paymentMethod || (data.registrationAmount && Number(data.registrationAmount) > 0 ? "RAZORPAY" : "WAIVED"),
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        active: true,
        mustChangePassword: true,
        employeeCode: true,
        designation: true,
        address: true,
        salary: true,
        registrationAmount: true,
        paymentMethod: true,
        razorpayPaymentId: true,
        razorpayOrderId: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (Array.isArray(data.agentIds) && data.agentIds.length > 0) {
      await tx.user.updateMany({
        where: {
          id: { in: data.agentIds.map(Number) },
          role: UserRole.AGENT,
        },
        data: {
          assignedAdminId: admin.id,
        },
      });
    }

    return admin;
  });

  if (cleanEmail) {
    sendAdminCredentialsEmail(
      cleanEmail,
      data.name,
      newAdmin.employeeCode || code,
      data.password || "Admin@123"
    ).catch((err) => {
      console.warn("⚠️ Failed to send Area Admin credentials email:", err.message);
    });
  }

  invalidateAdminCache();
  return newAdmin;
}

/*
 * Update Admin
 */
export async function updateAdmin(
  adminId: number,
  data: any,
  callerUser?: { id: number; role: UserRole }
) {
  const admin = await prisma.user.findFirst({
    where: { id: adminId, role: UserRole.ADMIN },
  });
  if (!admin) {
    throw new Error("Admin not found");
  }

  // Security enforcement: If caller is not SUPER_AGENT, restrict administrative fields
  const isSuperAgent = callerUser?.role === UserRole.SUPER_AGENT;

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.designation !== undefined) updateData.designation = data.designation;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.profileImage !== undefined) updateData.profileImage = data.profileImage;

  // Only SUPER_AGENT can change status, active flag, salary, or designation-level privileges
  if (isSuperAgent) {
    if (data.status !== undefined) updateData.status = data.status;
    if (data.active !== undefined) updateData.active = Boolean(data.active);
    if (data.salary !== undefined) updateData.salary = Number(data.salary);
  }

  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  const updated = await prisma.user.update({
    where: { id: adminId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      active: true,
      employeeCode: true,
      designation: true,
      address: true,
      profileImage: true,
      salary: isSuperAgent ? true : false,
      updatedAt: true,
    },
  });

  invalidateAdminCache();
  return updated;
}

/*
 * Delete Admin (Super Admin action)
 * Unassigns all agents under this admin so agents and workers remain safe
 */
export async function deleteAdmin(adminId: number) {
  const admin = await prisma.user.findFirst({
    where: { id: adminId, role: UserRole.ADMIN },
  });
  if (!admin) {
    throw new Error("Admin not found");
  }

  return prisma.$transaction(async (tx) => {
    // Unassign agents under this admin
    await tx.user.updateMany({
      where: { assignedAdminId: adminId },
      data: { assignedAdminId: null },
    });

    // Reassign sites created by this admin
    await tx.site.updateMany({
      where: { createdById: adminId },
      data: { createdById: 1 },
    });

    // Delete the admin user
    await tx.user.delete({
      where: { id: adminId },
    });

    invalidateAdminCache();
    return { success: true, message: "Admin removed successfully" };
  });
}

/*
 * Assign agents to Admin
 */
export async function assignAgentsToAdmin(adminId: number, agentIds: number[]) {
  const admin = await prisma.user.findFirst({
    where: { id: adminId, role: UserRole.ADMIN },
  });
  if (!admin) {
    throw new Error("Admin not found");
  }

  await prisma.user.updateMany({
    where: {
      id: { in: agentIds },
      role: UserRole.AGENT,
    },
    data: {
      assignedAdminId: adminId,
    },
  });

  return { success: true, count: agentIds.length };
}

/*
 * Remove an agent from Admin
 */
export async function removeAgentFromAdmin(adminId: number, agentId: number) {
  await prisma.user.updateMany({
    where: {
      id: agentId,
      assignedAdminId: adminId,
    },
    data: {
      assignedAdminId: null,
    },
  });

  return { success: true };
}

/*
 * Admin Portal: Admin directly registers a new agent under their jurisdiction
 */
export async function adminCreateAgent(
  adminId: number,
  data: {
    name: string;
    email?: string;
    password?: string;
    phone?: string;
    designation?: string;
    siteId?: number;
    employeeCode?: string;
    salary?: number;
    profileImage?: string;
    address?: string;
    registrationAmount?: number;
    paymentMethod?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
  }
) {
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });
  if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_AGENT)) {
    throw new Error("Unauthorized: Only Admin or Super Admin can register agents");
  }

  const cleanEmail = data.email?.trim()?.toLowerCase() || null;
  if (cleanEmail) {
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      throw new Error("Email already registered for another user");
    }
  }

  let code = data.employeeCode?.trim();
  if (!code) {
    const allAgentsWithCode = await prisma.user.findMany({
      where: {
        role: UserRole.AGENT,
        employeeCode: { startsWith: "AGT-" },
      },
      select: { employeeCode: true },
    });
    let maxNum = 0;
    for (const ag of allAgentsWithCode) {
      if (ag.employeeCode) {
        const match = ag.employeeCode.match(/AGT-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
    code = `AGT-${String(maxNum + 1).padStart(3, "0")}`;
  }

  const existingCode = await prisma.user.findFirst({ where: { employeeCode: code } });
  if (existingCode) {
    code = `AGT-${Date.now().toString().slice(-4)}`;
  }

  const hashedPassword = await hashPassword(data.password || "Agent@123");

  const newAgent = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        name: data.name,
        email: cleanEmail,
        password: hashedPassword,
        phone: data.phone,
        role: UserRole.AGENT,
        employeeCode: code,
        designation: data.designation || "Field Supervisor",
        salary: data.salary ? Number(data.salary) : 45000,
        siteId: data.siteId ? Number(data.siteId) : undefined,
        assignedAdminId: adminId,
        profileImage: data.profileImage,
        address: data.address,
        registrationAmount: data.registrationAmount ? Number(data.registrationAmount) : undefined,
        paymentMethod: data.paymentMethod || (data.razorpayPaymentId ? 'RAZORPAY' : undefined),
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        mustChangePassword: true,
        active: true,
      },
      include: {
        site: true,
        assignedAdmin: {
          select: { id: true, name: true, employeeCode: true },
        },
      },
    });
  });

  return newAgent;
}

/*
 * Admin Portal: Admin deletes an agent under their supervision
 */
export async function adminDeleteAgent(
  callerUser: { id: number; role: UserRole },
  agentId: number
) {
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { id: true, role: true, assignedAdminId: true },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  if (agent.role !== UserRole.AGENT) {
    throw new Error("Target user is not a field agent");
  }

  if (callerUser.role === UserRole.ADMIN && agent.assignedAdminId !== callerUser.id) {
    throw new Error("Access denied: You can only delete agents working under your jurisdiction");
  }

  return deleteUser(agentId, callerUser);
}
