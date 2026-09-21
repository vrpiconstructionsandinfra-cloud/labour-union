import prisma from "../config/prisma";
import ExcelJS from "exceljs";

export const INCENTIVE_RATE_PER_WORKER = 25.0;

/**
 * Ensure all workers assigned to an agent have their ₹25 registration incentive record in DB
 */
export const syncMissingWorkerIncentives = async () => {
  try {
    const unlinkedWorkers = await prisma.user.findMany({
      where: {
        role: "WORKER",
        assignedAgentId: { not: null },
        registrationIncentiveGenerated: null,
      },
      select: {
        id: true,
        employeeCode: true,
        assignedAgentId: true,
        createdAt: true,
      },
    });

    for (const w of unlinkedWorkers) {
      if (w.assignedAgentId) {
        await prisma.workerRegistrationIncentive.create({
          data: {
            agentId: w.assignedAgentId,
            workerId: w.id,
            amount: INCENTIVE_RATE_PER_WORKER,
            status: "CREDITED",
            reference: `REG-${w.employeeCode || w.id}`,
            createdAt: w.createdAt || new Date(),
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Incentive auto-sync warning:", err);
  }
};

/**
 * Super Agent Global Summary KPI Cards
 */
export const getSuperAgentIncentivesSummary = async () => {
  await syncMissingWorkerIncentives();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalAgents, totalWorkersRegistered, totalIncentivesAgg, thisMonthIncentivesAgg] =
    await Promise.all([
      prisma.user.count({
        where: { role: "AGENT", status: "ACTIVE" },
      }),
      prisma.user.count({
        where: { role: "WORKER" },
      }),
      prisma.workerRegistrationIncentive.aggregate({
        where: { status: "CREDITED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.workerRegistrationIncentive.aggregate({
        where: {
          status: "CREDITED",
          createdAt: {
            gte: startOfMonth,
          },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

  const totalIncentives = totalIncentivesAgg._sum.amount ?? (totalIncentivesAgg._count.id * INCENTIVE_RATE_PER_WORKER);
  const thisMonthIncentives = thisMonthIncentivesAgg._sum.amount ?? 0;

  return {
    totalAgents,
    workersRegistered: totalWorkersRegistered,
    totalIncentives,
    thisMonthIncentives,
    ratePerWorker: INCENTIVE_RATE_PER_WORKER,
  };
};

/**
 * Super Agent Paginated Agent Incentive List with Search and Filters
 */
export const getAgentIncentivesList = async (query: {
  search?: string;
  status?: string;
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  await syncMissingWorkerIncentives();

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
  const skip = (page - 1) * limit;

  // Build where filter for agents
  const whereAgent: any = {
    role: "AGENT",
  };

  if (query.status && query.status !== "ALL") {
    whereAgent.status = query.status.toUpperCase();
  }

  if (query.search && query.search.trim()) {
    const s = query.search.trim();
    whereAgent.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { employeeCode: { contains: s, mode: "insensitive" } },
      { phone: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Date range filter for incentives/worker counts
  let dateRangeFilter: { gte?: Date; lte?: Date } | undefined = undefined;
  if (query.dateFilter === "today") {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    dateRangeFilter = { gte: todayStart };
  } else if (query.dateFilter === "this_week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    dateRangeFilter = { gte: startOfWeek };
  } else if (query.dateFilter === "this_month") {
    dateRangeFilter = { gte: startOfMonth };
  } else if (query.dateFilter === "custom" && (query.startDate || query.endDate)) {
    dateRangeFilter = {};
    if (query.startDate) dateRangeFilter.gte = new Date(query.startDate);
    if (query.endDate) {
      const e = new Date(query.endDate);
      e.setHours(23, 59, 59, 999);
      dateRangeFilter.lte = e;
    }
  }

  // Query agents and total count
  const [totalRecords, agents] = await Promise.all([
    prisma.user.count({ where: whereAgent }),
    prisma.user.findMany({
      where: whereAgent,
      select: {
        id: true,
        name: true,
        employeeCode: true,
        phone: true,
        email: true,
        status: true,
        profileImage: true,
        createdAt: true,
        registrationIncentivesEarned: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            worker: {
              select: {
                id: true,
                name: true,
                employeeCode: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            workers: true,
            registrationIncentivesEarned: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
  ]);

  const items = agents.map((agent) => {
    const allIncentives = agent.registrationIncentivesEarned || [];
    
    const totalWorkersAdded = agent._count.registrationIncentivesEarned > 0
      ? agent._count.registrationIncentivesEarned
      : agent._count.workers;

    const totalIncentive = allIncentives.reduce((sum, inc) => sum + (inc.amount || INCENTIVE_RATE_PER_WORKER), 0)
      || (totalWorkersAdded * INCENTIVE_RATE_PER_WORKER);

    const thisMonthIncentivesList = allIncentives.filter((inc) => new Date(inc.createdAt) >= startOfMonth);
    const thisMonthIncentive = thisMonthIncentivesList.reduce(
      (sum, inc) => sum + (inc.amount || INCENTIVE_RATE_PER_WORKER),
      0
    );

    let filteredCount = totalWorkersAdded;
    if (dateRangeFilter) {
      filteredCount = allIncentives.filter((inc) => {
        const d = new Date(inc.createdAt);
        if (dateRangeFilter?.gte && d < dateRangeFilter.gte) return false;
        if (dateRangeFilter?.lte && d > dateRangeFilter.lte) return false;
        return true;
      }).length;
    }

    const latestIncentive = allIncentives[0];
    const lastWorkerAdded = latestIncentive
      ? {
          name: latestIncentive.worker?.name || "Worker",
          employeeCode: latestIncentive.worker?.employeeCode || `WRK-${latestIncentive.worker?.id}`,
          date: latestIncentive.createdAt,
        }
      : null;

    return {
      agentId: agent.id,
      name: agent.name,
      employeeCode: agent.employeeCode || `AGT-00${agent.id}`,
      phone: agent.phone || "—",
      email: agent.email || "—",
      status: agent.status,
      profileImage: agent.profileImage,
      workersAdded: filteredCount,
      totalWorkersAllTime: totalWorkersAdded,
      incentiveRate: INCENTIVE_RATE_PER_WORKER,
      totalIncentive,
      thisMonthIncentive,
      lastWorkerAdded,
    };
  });

  return {
    items,
    pagination: {
      total: totalRecords,
      page,
      limit,
      totalPages: Math.ceil(totalRecords / limit) || 1,
    },
  };
};

/**
 * Detailed Agent Incentive Profile & Transaction History (IDOR Protected)
 */
export const getAgentIncentiveDetails = async (agentId: number, page = 1, limit = 50) => {
  await syncMissingWorkerIncentives();

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      phone: true,
      email: true,
      status: true,
      profileImage: true,
      designation: true,
      joiningDate: true,
      site: {
        select: {
          id: true,
          siteName: true,
          siteCode: true,
        },
      },
    },
  });

  if (!agent) {
    throw new Error("Agent not found");
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const skip = (page - 1) * limit;

  const [totalIncentivesCount, totalIncentiveAgg, thisMonthIncentiveAgg, historyRecords] =
    await Promise.all([
      prisma.workerRegistrationIncentive.count({
        where: { agentId },
      }),
      prisma.workerRegistrationIncentive.aggregate({
        where: { agentId, status: "CREDITED" },
        _sum: { amount: true },
      }),
      prisma.workerRegistrationIncentive.aggregate({
        where: {
          agentId,
          status: "CREDITED",
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.workerRegistrationIncentive.findMany({
        where: { agentId },
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              designation: true,
              salary: true,
              phone: true,
              profileImage: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

  const totalIncentive = totalIncentiveAgg._sum.amount ?? (totalIncentivesCount * INCENTIVE_RATE_PER_WORKER);
  const thisMonthIncentive = thisMonthIncentiveAgg._sum.amount ?? 0;

  const history = historyRecords.map((item) => ({
    id: item.id,
    reference: item.reference || `REG-${item.worker?.employeeCode || item.workerId}`,
    date: item.createdAt,
    workerId: item.worker?.id,
    workerName: item.worker?.name || "Worker",
    workerEmployeeCode: item.worker?.employeeCode || `WRK-${item.workerId}`,
    designation: item.worker?.designation || "Construction Labor",
    amount: item.amount,
    type: item.type,
    status: item.status,
  }));

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      employeeCode: agent.employeeCode || `AGT-00${agent.id}`,
      phone: agent.phone || "—",
      email: agent.email || "—",
      status: agent.status,
      designation: agent.designation || "Field Supervisor",
      profileImage: agent.profileImage,
      siteName: agent.site?.siteName || "Direct HQ",
    },
    summary: {
      workersRegistered: totalIncentivesCount,
      incentiveRate: INCENTIVE_RATE_PER_WORKER,
      totalIncentive,
      thisMonthIncentive,
    },
    history,
    pagination: {
      total: totalIncentivesCount,
      page,
      limit,
      totalPages: Math.ceil(totalIncentivesCount / limit) || 1,
    },
  };
};

/**
 * Authenticated Agent's Own Summary for Dashboard Widget
 */
export const getMyAgentIncentiveSummary = async (agentId: number) => {
  await syncMissingWorkerIncentives();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalCount, totalIncentiveAgg, thisMonthIncentiveAgg] = await Promise.all([
    prisma.workerRegistrationIncentive.count({
      where: { agentId, status: "CREDITED" },
    }),
    prisma.workerRegistrationIncentive.aggregate({
      where: { agentId, status: "CREDITED" },
      _sum: { amount: true },
    }),
    prisma.workerRegistrationIncentive.aggregate({
      where: { agentId, status: "CREDITED", createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);

  const totalIncentive = totalIncentiveAgg._sum.amount ?? (totalCount * INCENTIVE_RATE_PER_WORKER);
  const thisMonthIncentive = thisMonthIncentiveAgg._sum.amount ?? 0;

  return {
    myWorkersRegistered: totalCount,
    myRegistrationIncentives: totalIncentive,
    thisMonthIncentive,
    ratePerWorker: INCENTIVE_RATE_PER_WORKER,
  };
};

/**
 * Generate Multi-Sheet Excel Workbook (.xlsx) with Professional Styling
 */
export const generateAgentIncentivesExcelBuffer = async (): Promise<Buffer> => {
  await syncMissingWorkerIncentives();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Labor Union Management System";
  workbook.created = new Date();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [agents, allIncentives] = await Promise.all([
    prisma.user.findMany({
      where: { role: "AGENT" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        phone: true,
        status: true,
        registrationIncentivesEarned: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
            worker: {
              select: {
                name: true,
                employeeCode: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            workers: true,
            registrationIncentivesEarned: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.workerRegistrationIncentive.findMany({
      include: {
        agent: {
          select: {
            name: true,
            employeeCode: true,
            phone: true,
          },
        },
        worker: {
          select: {
            name: true,
            employeeCode: true,
            designation: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // ═══════════════════════════════════════════════════════════
  // SHEET 1: AGENT INCENTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet("Agent Incentive Summary", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  sheet1.mergeCells("A1:I1");
  const titleCell1 = sheet1.getCell("A1");
  titleCell1.value = `Labor Union Management — Worker Registration Incentive Summary (Generated: ${now.toLocaleDateString("en-IN")})`;
  titleCell1.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleCell1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet1.getRow(1).height = 28;

  sheet1.getRow(2).values = [
    "Agent Name",
    "Agent ID",
    "Phone Number",
    "Status",
    "Workers Added",
    "Rate Per Worker",
    "Total Incentive (₹)",
    "Current Month (₹)",
    "Last Worker Added Date",
  ];

  sheet1.getRow(2).height = 24;
  sheet1.getRow(2).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF334155" } },
    };
  });

  agents.forEach((agent, idx) => {
    const incentives = agent.registrationIncentivesEarned || [];
    const workersAdded = agent._count.registrationIncentivesEarned > 0
      ? agent._count.registrationIncentivesEarned
      : agent._count.workers;
    
    const totalIncentive = incentives.reduce((sum, inc) => sum + (inc.amount || INCENTIVE_RATE_PER_WORKER), 0)
      || (workersAdded * INCENTIVE_RATE_PER_WORKER);

    const thisMonth = incentives
      .filter((inc) => new Date(inc.createdAt) >= startOfMonth)
      .reduce((sum, inc) => sum + (inc.amount || INCENTIVE_RATE_PER_WORKER), 0);

    const lastDate = incentives[0]?.createdAt
      ? new Date(incentives[0].createdAt).toLocaleDateString("en-IN")
      : "—";

    const row = sheet1.addRow([
      agent.name,
      agent.employeeCode || `AGT-00${agent.id}`,
      agent.phone || "—",
      agent.status,
      workersAdded,
      INCENTIVE_RATE_PER_WORKER,
      totalIncentive,
      thisMonth,
      lastDate,
    ]);

    row.height = 20;
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10 };
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber === 1 || colNumber === 2) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else if (colNumber === 5 || colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0";
      } else if (colNumber === 7 || colNumber === 8) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "₹#,##0.00";
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  sheet1.columns = [
    { width: 24 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 15 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 22 },
  ];

  // ═══════════════════════════════════════════════════════════
  // SHEET 2: INCENTIVE TRANSACTION HISTORY
  // ═══════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet("Incentive Transaction History", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  sheet2.mergeCells("A1:I1");
  const titleCell2 = sheet2.getCell("A1");
  titleCell2.value = `Labor Union Management — Detailed Worker Registration Incentive Ledger`;
  titleCell2.font = { name: "Calibri", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  titleCell2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet2.getRow(1).height = 28;

  sheet2.getRow(2).values = [
    "Reference",
    "Date & Time",
    "Agent Name",
    "Agent ID",
    "Worker Name",
    "Worker ID",
    "Trade Designation",
    "Incentive (₹)",
    "Status",
  ];

  sheet2.getRow(2).height = 24;
  sheet2.getRow(2).eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF334155" } },
    };
  });

  allIncentives.forEach((inc, idx) => {
    const row = sheet2.addRow([
      inc.reference || `REG-${inc.worker?.employeeCode || inc.workerId}`,
      new Date(inc.createdAt).toLocaleString("en-IN"),
      inc.agent?.name || "Agent",
      inc.agent?.employeeCode || `AGT-00${inc.agentId}`,
      inc.worker?.name || "Worker",
      inc.worker?.employeeCode || `WRK-${inc.workerId}`,
      inc.worker?.designation || "Construction Labor",
      inc.amount,
      inc.status,
    ]);

    row.height = 20;
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10 };
      if (!isEven) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colNumber === 8) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "₹#,##0.00";
      } else if (colNumber === 3 || colNumber === 5) {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });
  });

  sheet2.columns = [
    { width: 18 },
    { width: 22 },
    { width: 22 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 24 },
    { width: 16 },
    { width: 14 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

