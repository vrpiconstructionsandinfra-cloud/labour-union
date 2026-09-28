import prisma from "../config/prisma";
import { CreateSiteInput } from "../validators/site.validator";
import { createNotification } from "./notification.service";

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

  return prisma.site.create({
    data: {
      ...data,
      siteCode,
      createdById
    }
  });
};

export const getAllSites = async () => {

  return prisma.site.findMany({
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },

      users: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    },

    orderBy: {
      createdAt: "desc"
    }
  });

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
      createdBy: true
    }

  });

};

export const updateSite = async (
  id: number,
  data: Partial<CreateSiteInput>
) => {
  const existingSite = await prisma.site.findUnique({ where: { id } });
  const updatedSite = await prisma.site.update({
    where: { id },
    data
  });

  if (existingSite && (data as any).status && (existingSite as any).status !== (data as any).status) {
    createNotification({
      role: "SUPER_AGENT",
      title: "Site Status Changed",
      message: `Site "${updatedSite.siteName}" (${updatedSite.siteCode}) status changed from "${(existingSite as any).status || 'ACTIVE'}" to "${(data as any).status}".`,
      type: "SITE"
    }).catch(() => {});
  }

  return updatedSite;
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

  return result;
};