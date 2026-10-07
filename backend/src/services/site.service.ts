import prisma from "../config/prisma";
import { CreateSiteInput } from "../validators/site.validator";
import { createNotification } from "./notification.service";
import { memoryCache } from "../utils/cache";

export function invalidateSiteCache(): void {
  memoryCache.delPrefix("sites_");
  memoryCache.delPrefix("dashboard_");
}

export const createSite = async (
  data: CreateSiteInput,
  createdById: number
) => {
  let siteCode = data.siteCode?.trim() || `SITE-${Date.now().toString().slice(-4)}`;

  const exists = await prisma.site.findUnique({
    where: {
      siteCode
    }
  });

  if (exists) {
    siteCode = `SITE-${Date.now().toString().slice(-6)}`;
  }

  const newSite = await prisma.site.create({
    data: {
      ...data,
      siteCode,
      createdById
    }
  });

  invalidateSiteCache();
  return newSite;
};

export const getAllSites = async () => {
  const cacheKey = "sites_all";
  const cached = memoryCache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const sites = await prisma.site.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true,
          designation: true,
          phone: true
        }
      },

      users: {
        select: {
          id: true,
          name: true,
          role: true,
          employeeCode: true
        }
      }
    },

    orderBy: {
      createdAt: "desc"
    }
  });

  memoryCache.set(cacheKey, sites, 30);
  return sites;
};

export const getSiteById = async (
  id: number
) => {

  return prisma.site.findUnique({

    where: {
      id
    },

    include: {
      users: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true,
          designation: true,
          phone: true
        }
      }
    }

  });

};

export const updateSite = async (
  id: number,
  data: Partial<CreateSiteInput> & { createdById?: number; adminId?: number }
) => {
  const existingSite = await prisma.site.findUnique({
    where: { id },
    include: { createdBy: true }
  });

  if (!existingSite) {
    throw new Error("Working site not found");
  }

  const updateData: any = {};
  if (data.siteName !== undefined) updateData.siteName = data.siteName;
  if (data.siteCode !== undefined) updateData.siteCode = data.siteCode;
  if (data.companyName !== undefined) updateData.companyName = data.companyName;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.pincode !== undefined) updateData.pincode = data.pincode;
  if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
  if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber;
  if (data.status !== undefined) updateData.status = data.status;
  if ((data as any).active !== undefined) updateData.active = Boolean((data as any).active);

  // Assign to Admin (via adminId or createdById)
  const rawAdminId = data.adminId !== undefined ? data.adminId : data.createdById;
  if (rawAdminId !== undefined) {
    const targetAdminId = Number(rawAdminId);
    if (!isNaN(targetAdminId) && targetAdminId > 0) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetAdminId } });
      if (targetUser) {
        updateData.createdById = targetAdminId;
      }
    }
  }

  const updatedSite = await prisma.site.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          employeeCode: true,
          designation: true,
          phone: true
        }
      },
      users: {
        select: {
          id: true,
          name: true,
          role: true,
          employeeCode: true
        }
      }
    }
  });

  if (existingSite && (data as any).status && (existingSite as any).status !== (data as any).status) {
    createNotification({
      role: "SUPER_AGENT",
      title: "Site Status Changed",
      message: `Site "${updatedSite.siteName}" (${updatedSite.siteCode}) status changed from "${(existingSite as any).status || 'ACTIVE'}" to "${(data as any).status}".`,
      type: "SITE"
    }).catch(() => {});
  }

  if (updateData.createdById && updateData.createdById !== existingSite.createdById) {
    createNotification({
      userId: updateData.createdById,
      title: "Working Site Assigned",
      message: `Working Site "${updatedSite.siteName}" (${updatedSite.siteCode}) has been assigned to your supervision.`,
      type: "SITE"
    }).catch(() => {});
  }

  memoryCache.delPrefix("admins_");
  invalidateSiteCache();
  return updatedSite;
};

export const assignAdminToSite = async (siteId: number, adminId: number) => {
  return updateSite(siteId, { adminId });
};

export const deleteSite = async (id: number) => {
  const existingSite = await prisma.site.findUnique({ where: { id } });
  if (!existingSite) {
    throw new Error("Working site not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Unlink workers/users assigned to this site
    await tx.user.updateMany({
      where: { siteId: id },
      data: { siteId: null }
    });

    // 2. Unlink attendance records linked to this site
    await tx.attendance.updateMany({
      where: { siteId: id },
      data: { siteId: null }
    });

    // 3. Delete site assignments
    await tx.siteAssignment.deleteMany({
      where: { siteId: id }
    });

    // 4. Delete site payments
    await tx.sitePayment.deleteMany({
      where: { siteId: id }
    });

    // 5. Delete the site
    return tx.site.delete({
      where: { id }
    });
  });

  createNotification({
    role: "SUPER_AGENT",
    title: "Working Site Deleted",
    message: `Site "${existingSite.siteName}" (${existingSite.siteCode}) has been deleted.`,
    type: "SITE"
  }).catch(() => {});

  invalidateSiteCache();
  return result;
};