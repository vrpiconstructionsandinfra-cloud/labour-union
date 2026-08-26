import prisma from "../config/prisma";

/*
 Assign worker to site
*/
export async function assignWorkerToSite(
  workerId: number,
  siteId: number
) {
  const worker = await prisma.user.findUnique({
    where: {
      id: workerId,
    },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  const site = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
  });

  if (!site) {
    throw new Error("Site not found");
  }

  return prisma.user.update({
    where: {
      id: workerId,
    },
    data: {
      siteId,
    },
  });
}

/*
 Remove worker from site
*/
export async function removeWorkerFromSite(
  workerId: number
) {
  const worker = await prisma.user.findUnique({
    where: {
      id: workerId,
    },
  });

  if (!worker) {
    throw new Error("Worker not found");
  }

  return prisma.user.update({
    where: {
      id: workerId,
    },
    data: {
      siteId: null,
    },
  });
}

/*
 Get workers of a site
*/
export async function getSiteWorkers(
  siteId: number
) {
  return prisma.user.findMany({
    where: {
      siteId,
      role: "WORKER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      employeeCode: true,
      designation: true,
    },
  });
}

/*
 Get worker site
*/
export async function getWorkerSite(
  workerId: number
) {
  return prisma.user.findUnique({
    where: {
      id: workerId,
    },
    select: {
      site: true,
    },
  });
}