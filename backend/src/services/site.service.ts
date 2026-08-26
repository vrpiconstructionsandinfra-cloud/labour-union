import prisma from "../config/prisma";
import { CreateSiteInput } from "../validators/site.validator";
import { createNotification } from "./notification.service";

export const createSite = async (
  data: CreateSiteInput,
  createdById: number
) => {

  const exists = await prisma.site.findUnique({
    where: {
      siteCode: data.siteCode
    }
  });

  if (exists) {
    throw new Error("Site code already exists");
  }

  return prisma.site.create({
    data: {
      ...data,
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

export const deleteSite = async (
  id: number
) => {

  return prisma.site.delete({

    where: {
      id
    }

  });

};